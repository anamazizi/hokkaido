-- Migration: Fix RLS policies for order_logs table to ensure inserts work reliably
-- Idempotent SQL script for Supabase PostgreSQL
-- Date: 2026-09-17

-- 1. Ensure admin user with email 'anamazizi@gmail.com' exists in user_profiles
-- This ensures the admin email bypass works both in frontend and backend RLS policies
INSERT INTO public.user_profiles (id, email, full_name, role)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Anam Azizi') AS full_name,
    'admin' AS role
FROM auth.users u
WHERE u.email = 'anamazizi@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = u.id
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = 'admin';

-- 2. Update RLS policy for order_logs INSERT to allow authenticated users 
--    who either have staff/admin role OR are the configured admin email
DROP POLICY IF EXISTS "Staff and admin can insert order_logs" ON public.order_logs;

CREATE POLICY "Allow authenticated insert order_logs for staff/admin/admin_email" 
ON public.order_logs
FOR INSERT TO authenticated
WITH CHECK (
    -- Allow if user has staff or admin role in user_profiles
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
    OR
    -- Allow if user has the admin email (for admin email bypass scenario)
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND email = 'anamazizi@gmail.com'
    )
);

-- 3. Ensure RLS policy for SELECT remains unchanged but make sure it's idempotent
DROP POLICY IF EXISTS "Staff and admin can read order_logs" ON public.order_logs;

CREATE POLICY "Staff and admin can read order_logs" 
ON public.order_logs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
    OR
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND email = 'anamazizi@gmail.com'
    )
);

-- 4. Add UPDATE policy for admin only to maintain audit integrity
-- Logs should be immutable except for admins in exceptional cases
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

-- 5. Ensure DELETE policy for admin only (should rarely be used)
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

-- 6. Log the migration for tracking
COMMENT ON TABLE public.order_logs IS 'Audit logs for order status changes and cancellations - RLS policies updated 2026-09-17';

-- 7. Verify the updated policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'order_logs'
ORDER BY policyname;