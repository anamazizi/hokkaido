-- Migration: Complete RLS policies for customer_reviews table (idempotent)
-- Date: 2026-09-19
-- Purpose: Ensure proper RLS policies for customer reviews system
--          Fixes issues with review submission not saving and dashboard not displaying reviews
--          This migration is safe to run multiple times (idempotent)

-- 1. Ensure table exists with correct schema
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

COMMENT ON TABLE public.customer_reviews IS 'Customer reviews with rating, pending admin approval';

-- 2. Enable Row Level Security (RLS) if not already enabled
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

-- 3. Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Allow public insert for reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow authenticated read all reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow staff/admin read all reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow staff/admin update reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow staff/admin delete reviews" ON public.customer_reviews;

-- 4. Recreate policies with proper access control

-- Policy 1: Allow ANYONE (including anonymous users) to insert reviews
-- This is crucial for the review submission form on the frontend
CREATE POLICY "Allow public insert for reviews" ON public.customer_reviews
    FOR INSERT TO public
    WITH CHECK (true);

-- Policy 2: Allow public to select only APPROVED reviews for homepage display
-- This prevents unapproved reviews from showing on the public website
CREATE POLICY "Allow public read approved reviews" ON public.customer_reviews
    FOR SELECT TO public
    USING (is_approved = true);

-- Policy 3: Allow ALL AUTHENTICATED users (not just staff/admin) to read ALL reviews
-- This is critical for the /urus dashboard to display both pending and approved reviews
CREATE POLICY "Allow authenticated read all reviews" ON public.customer_reviews
    FOR SELECT TO authenticated
    USING (true);

-- Policy 4: Allow staff/admin to update reviews (approve/unapprove, edit content)
CREATE POLICY "Allow staff/admin update reviews" ON public.customer_reviews
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

-- Policy 5: Allow staff/admin to delete reviews
CREATE POLICY "Allow staff/admin delete reviews" ON public.customer_reviews
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

-- 5. Ensure indexes exist for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_customer_reviews_is_approved ON public.customer_reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_created_at ON public.customer_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_rating ON public.customer_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_customer_name ON public.customer_reviews(customer_name);

-- 6. Add to Supabase Realtime publication for real-time updates (optional)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'customer_reviews'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_reviews;
        END IF;
    END IF;
END $$;

-- 7. Grant necessary permissions
GRANT ALL ON public.customer_reviews TO postgres, anon, authenticated, service_role;

-- 8. Log completion
COMMENT ON POLICY "Allow public insert for reviews" ON public.customer_reviews IS 'Allows anyone to submit reviews via frontend form';
COMMENT ON POLICY "Allow public read approved reviews" ON public.customer_reviews IS 'Public can only see approved reviews on homepage';
COMMENT ON POLICY "Allow authenticated read all reviews" ON public.customer_reviews IS 'Authenticated users can see all reviews (pending+approved) in dashboard';
COMMENT ON POLICY "Allow staff/admin update reviews" ON public.customer_reviews IS 'Only staff/admin can approve/unapprove or edit reviews';
COMMENT ON POLICY "Allow staff/admin delete reviews" ON public.customer_reviews IS 'Only staff/admin can delete reviews';

-- Migration verification query (for manual checking)
-- SELECT 
--     p.policyname,
--     p.permissive,
--     p.roles,
--     p.cmd
-- FROM pg_policies p
-- WHERE p.tablename = 'customer_reviews' AND p.schemaname = 'public'
-- ORDER BY p.policyname;