-- Migration: Fix order_logs schema, columns and RLS policies for robust audit trail
-- Idempotent SQL script for Supabase PostgreSQL
-- Date: 2026-09-18

-- 1. Ensure order_logs table has both 'action' and 'action_type' columns
-- Add 'action' column if missing (nullable, can be used as alias for action_type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'order_logs' 
        AND column_name = 'action'
    ) THEN
        ALTER TABLE public.order_logs ADD COLUMN action TEXT;
        COMMENT ON COLUMN public.order_logs.action IS 'Action performed (alias for action_type)';
    END IF;
END $$;

-- Add 'action_type' column if missing (should already exist, but ensure it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'order_logs' 
        AND column_name = 'action_type'
    ) THEN
        ALTER TABLE public.order_logs ADD COLUMN action_type TEXT NOT NULL DEFAULT 'status_update';
        COMMENT ON COLUMN public.order_logs.action_type IS 'Type of action: status_update, cancellation, etc.';
    END IF;
END $$;

-- 2. Update RLS policies for order_logs to allow INSERT and SELECT for all authenticated users
-- This ensures audit logs are always persisted regardless of user role
DROP POLICY IF EXISTS "Allow authenticated insert order_logs for staff/admin/admin_email" ON public.order_logs;
DROP POLICY IF EXISTS "Staff and admin can insert order_logs" ON public.order_logs;

CREATE POLICY "Allow authenticated insert order_logs"
ON public.order_logs
FOR INSERT TO authenticated
WITH CHECK (true);  -- Allow all authenticated users to insert logs

-- Also ensure SELECT policy allows all authenticated users
DROP POLICY IF EXISTS "Staff and admin can read order_logs" ON public.order_logs;
CREATE POLICY "Allow authenticated read order_logs"
ON public.order_logs
FOR SELECT TO authenticated
USING (true);

-- Keep UPDATE and DELETE policies restrictive (admin only)
-- (existing policies remain, but we ensure they are idempotent)
DROP POLICY IF EXISTS "Admins can update order_logs" ON public.order_logs;
CREATE POLICY "Admins can update order_logs"
ON public.order_logs
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND email = 'anamazizi@gmail.com'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND email = 'anamazizi@gmail.com'
    )
);

DROP POLICY IF EXISTS "Admins can delete order_logs" ON public.order_logs;
CREATE POLICY "Admins can delete order_logs"
ON public.order_logs
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND email = 'anamazizi@gmail.com'
    )
);

-- 3. Ensure order_logs is included in Supabase Realtime publication
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

-- 4. Create index on order_id for performance (if missing)
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON public.order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_created_at ON public.order_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_order_logs_actor_id ON public.order_logs(actor_id);

-- 5. Log migration completion
COMMENT ON TABLE public.order_logs IS 'Audit logs for order status changes and cancellations - RLS policies updated 2026-09-18';