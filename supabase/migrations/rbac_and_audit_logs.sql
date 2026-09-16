-- Migration: RBAC (Role-Based Access Control) & Audit Logs for Hokkaido Cheese Tart
-- Idempotent SQL script for Supabase PostgreSQL
-- Date: 2026-09-17

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'staff', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'User profile extensions with RBAC roles';
COMMENT ON COLUMN public.user_profiles.role IS 'RBAC role: user, staff, admin';

-- 2. Create order_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.order_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id),
    actor_name TEXT,
    actor_role TEXT,
    action_type TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.order_logs IS 'Audit logs for order status changes and cancellations';
COMMENT ON COLUMN public.order_logs.action_type IS 'Type of action: status_update, cancellation, etc.';

-- 3. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Staff and admin can view all user profiles
DROP POLICY IF EXISTS "Staff and admin can view profiles" ON public.user_profiles;
CREATE POLICY "Staff and admin can view profiles" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

-- Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Only admins can insert/delete user_profiles (trigger handles inserts)
DROP POLICY IF EXISTS "Admins can insert user_profiles" ON public.user_profiles;
CREATE POLICY "Admins can insert user_profiles" ON public.user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "Admins can delete user_profiles" ON public.user_profiles;
CREATE POLICY "Admins can delete user_profiles" ON public.user_profiles
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 5. Policies for order_logs
DROP POLICY IF EXISTS "Staff and admin can read order_logs" ON public.order_logs;
CREATE POLICY "Staff and admin can read order_logs" ON public.order_logs
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

DROP POLICY IF EXISTS "Staff and admin can insert order_logs" ON public.order_logs;
CREATE POLICY "Staff and admin can insert order_logs" ON public.order_logs
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

DROP POLICY IF EXISTS "Admins can delete order_logs" ON public.order_logs;
CREATE POLICY "Admins can delete order_logs" ON public.order_logs
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 6. Trigger to auto-update updated_at column on user_profiles
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- 7. Trigger to automatically insert user_profiles for new auth.users
CREATE OR REPLACE FUNCTION public.sync_user_profile_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    default_role TEXT := 'user';
BEGIN
    IF NEW.email = 'anamazizi@gmail.com' THEN
        default_role := 'admin';
    END IF;

    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Pengguna'), 
        default_role
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_user_profile_on_signup ON auth.users;
CREATE TRIGGER sync_user_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile_on_signup();

-- 8. Migrate existing auth.users to user_profiles (one-time)
INSERT INTO public.user_profiles (id, email, full_name, role)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Pengguna') AS full_name,
    CASE 
        WHEN email = 'anamazizi@gmail.com' THEN 'admin'
        ELSE 'user'
    END AS role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

-- 9. Add order_logs to Supabase Realtime publication safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'order_logs'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.order_logs;
        END IF;
    END IF;
END $$;

-- 10. Create index for performance
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON public.order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_created_at ON public.order_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_order_logs_actor_id ON public.order_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 11. Helper function to log order actions with current user context
CREATE OR REPLACE FUNCTION public.log_order_action(
    p_order_id UUID,
    p_action_type TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
    v_log_id UUID;
BEGIN
    SELECT id, full_name, role INTO v_user_id, v_user_name, v_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();

    INSERT INTO public.order_logs (order_id, actor_id, actor_name, actor_role, action_type, notes)
    VALUES (p_order_id, v_user_id, COALESCE(v_user_name, 'System'), COALESCE(v_user_role, 'system'), p_action_type, p_notes)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_order_action IS 'Helper function to log order actions with current user context';

-- 12. Trigger on orders table to log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM public.log_order_action(
            NEW.id,
            'status_update',
            'Status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_order_status_change ON public.orders;
CREATE TRIGGER log_order_status_change
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- 13. Trigger on orders table to log cancellations
CREATE OR REPLACE FUNCTION public.log_order_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        PERFORM public.log_order_action(
            NEW.id,
            'cancellation',
            'Order cancelled by ' || COALESCE((SELECT full_name FROM public.user_profiles WHERE id = auth.uid()), 'system')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_order_cancellation ON public.orders;
CREATE TRIGGER log_order_cancellation
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_order_cancellation();
