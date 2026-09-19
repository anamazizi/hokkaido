-- Migration: Create customer_reviews table for customer review & rating system
-- Idempotent SQL script for Supabase PostgreSQL
-- Date: 2026-09-19

-- 1. Create customer_reviews table
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
COMMENT ON COLUMN public.customer_reviews.rating IS 'Star rating from 1 to 5';
COMMENT ON COLUMN public.customer_reviews.verification_code IS '6-digit anti-spam verification code entered by customer';
COMMENT ON COLUMN public.customer_reviews.honeypot IS 'Hidden honeypot field to detect bot submissions';
COMMENT ON COLUMN public.customer_reviews.is_approved IS 'Whether review has been approved for display on homepage';

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

-- 3. Policies for customer_reviews
-- Allow anyone to insert a review (public submissions)
DROP POLICY IF EXISTS "Allow public insert for reviews" ON public.customer_reviews;
CREATE POLICY "Allow public insert for reviews" ON public.customer_reviews
    FOR INSERT TO public
    WITH CHECK (true);

-- Allow public to select only approved reviews for homepage
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.customer_reviews;
CREATE POLICY "Allow public read approved reviews" ON public.customer_reviews
    FOR SELECT TO public
    USING (is_approved = true);

-- Allow authenticated users (staff/admin) to read all reviews (including pending)
DROP POLICY IF EXISTS "Allow staff/admin read all reviews" ON public.customer_reviews;
CREATE POLICY "Allow staff/admin read all reviews" ON public.customer_reviews
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

-- Allow authenticated users (staff/admin) to update reviews (approve/unapprove, edit)
DROP POLICY IF EXISTS "Allow staff/admin update reviews" ON public.customer_reviews;
CREATE POLICY "Allow staff/admin update reviews" ON public.customer_reviews
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

-- Allow authenticated users (staff/admin) to delete reviews
DROP POLICY IF EXISTS "Allow staff/admin delete reviews" ON public.customer_reviews;
CREATE POLICY "Allow staff/admin delete reviews" ON public.customer_reviews
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

-- 4. Add to Supabase Realtime publication (optional)
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

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_reviews_is_approved ON public.customer_reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_created_at ON public.customer_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_rating ON public.customer_reviews(rating);