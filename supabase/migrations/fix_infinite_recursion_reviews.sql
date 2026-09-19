-- Migration: Fix infinite recursion in customer_reviews RLS policies (idempotent)
-- Date: 2026-09-19
-- Purpose: Resolve "infinite recursion detected in policy for relation 'user_profiles'" error
--          Replace recursive subqueries with simple auth.role() checks
--          This migration is safe to run multiple times (idempotent)

-- 1. Ensure table exists (safety check)
CREATE TABLE IF NOT EXISTS public.customer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    honeypot TEXT DEFAULT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add audit columns if they don't exist (keeping for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_reviews' 
        AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.customer_reviews ADD COLUMN approved_by UUID DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_reviews' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.customer_reviews ADD COLUMN approved_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 3. Enable Row Level Security (RLS) if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'customer_reviews' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;
-- 4. Drop ALL existing customer_reviews policies to eliminate recursion issues
-- IMPORTANT: This removes any recursive subqueries to user_profiles table
DROP POLICY IF EXISTS "Allow public insert for reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow authenticated read all reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow authenticated update reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow authenticated delete reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow staff/admin update all fields" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow staff/admin delete reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow staff/admin update reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow staff/admin read all reviews" ON public.customer_reviews;

-- 5. Recreate SIMPLE policies WITHOUT any recursive subqueries to user_profiles
-- Using only auth.role() checks to prevent infinite recursion

-- Policy 1: Allow ANYONE (including anonymous) to INSERT reviews
-- This is needed for the frontend review submission form
CREATE POLICY "Allow public insert for reviews" ON public.customer_reviews
    FOR INSERT TO public
    WITH CHECK (true);

-- Policy 2: Allow public to SELECT only APPROVED reviews (for homepage)
-- Anonymous users and public can only see approved reviews
CREATE POLICY "Allow public read approved reviews" ON public.customer_reviews
    FOR SELECT TO public
    USING (is_approved = true);

-- Policy 3: Allow authenticated users to SELECT ALL reviews (for dashboard)
-- This uses auth.role() check instead of subquery to user_profiles
CREATE POLICY "Allow authenticated read all reviews" ON public.customer_reviews
    FOR SELECT TO authenticated
    USING (auth.role() = 'authenticated');

-- Policy 4: Allow authenticated users to UPDATE reviews (approve/unapprove)
-- Simple auth.role() check without recursive subquery
CREATE POLICY "Allow authenticated update reviews" ON public.customer_reviews
    FOR UPDATE TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy 5: Allow authenticated users to DELETE reviews
-- Simple auth.role() check without recursive subquery
CREATE POLICY "Allow authenticated delete reviews" ON public.customer_reviews
    FOR DELETE TO authenticated
    USING (auth.role() = 'authenticated');

-- 6. Grant necessary permissions
GRANT ALL ON public.customer_reviews TO postgres, service_role;
GRANT SELECT ON public.customer_reviews TO anon, authenticated;
GRANT INSERT ON public.customer_reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON public.customer_reviews TO authenticated;

-- 7. Create trigger for audit trail (optional, maintains previous functionality)
CREATE OR REPLACE FUNCTION update_review_approval_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- When is_approved changes from false to true
    IF OLD.is_approved = false AND NEW.is_approved = true THEN
        NEW.approved_by := auth.uid();
        NEW.approved_at := NOW();
    END IF;
    
    -- When is_approved changes from true to false (unapprove)
    IF OLD.is_approved = true AND NEW.is_approved = false THEN
        NEW.approved_by := NULL;
        NEW.approved_at := NULL;
    END IF;
    
    -- Always update updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_review_approval_audit ON public.customer_reviews;
CREATE TRIGGER trigger_update_review_approval_audit
    BEFORE UPDATE ON public.customer_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_approval_audit();

-- 8. Log completion
COMMENT ON POLICY "Allow public insert for reviews" ON public.customer_reviews IS 'Allows anyone to submit reviews via frontend form';
COMMENT ON POLICY "Allow public read approved reviews" ON public.customer_reviews IS 'Public can only see approved reviews on homepage';
COMMENT ON POLICY "Allow authenticated read all reviews" ON public.customer_reviews IS 'Authenticated users can see all reviews (pending+approved) in dashboard';
COMMENT ON POLICY "Allow authenticated update reviews" ON public.customer_reviews IS 'Authenticated users can approve/unapprove reviews (no recursion)';
COMMENT ON POLICY "Allow authenticated delete reviews" ON public.customer_reviews IS 'Authenticated users can delete reviews (no recursion)';

-- Migration verification query
/*
SELECT 
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check
FROM pg_policies p
WHERE p.tablename = 'customer_reviews' AND p.schemaname = 'public'
ORDER BY p.policyname;
*/