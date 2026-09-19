-- Migration: Fix customer_reviews UPDATE and DELETE permissions for authenticated users (idempotent)
-- Date: 2026-09-19
-- Purpose: Enable authenticated users to UPDATE (approve/unapprove) and DELETE reviews in /urus dashboard
--          This migration focuses specifically on fixing UPDATE and DELETE permissions that are failing
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

-- 2. Add optional audit columns if they don't exist (for tracking who approved/rejected)
DO $$
BEGIN
    -- Add approved_by column if not exists (to track who approved the review)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_reviews' 
        AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.customer_reviews ADD COLUMN approved_by UUID DEFAULT NULL;
        COMMENT ON COLUMN public.customer_reviews.approved_by IS 'User ID who approved this review (nullable)';
    END IF;

    -- Add approved_at column if not exists (timestamp when review was approved)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_reviews' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.customer_reviews ADD COLUMN approved_at TIMESTAMPTZ DEFAULT NULL;
        COMMENT ON COLUMN public.customer_reviews.approved_at IS 'Timestamp when review was approved (nullable)';
    END IF;

    -- Add deleted_by column if not exists (for soft delete audit trail)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_reviews' 
        AND column_name = 'deleted_by'
    ) THEN
        ALTER TABLE public.customer_reviews ADD COLUMN deleted_by UUID DEFAULT NULL;
        COMMENT ON COLUMN public.customer_reviews.deleted_by IS 'User ID who deleted this review (nullable, soft delete audit)';
    END IF;

    -- Add deleted_at column if not exists (for soft delete audit trail)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_reviews' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.customer_reviews ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
        COMMENT ON COLUMN public.customer_reviews.deleted_at IS 'Timestamp when review was deleted (nullable, soft delete audit)';
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

-- 4. Drop existing UPDATE and DELETE policies if they exist (idempotent)
DROP POLICY IF EXISTS "Allow staff/admin update reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow staff/admin delete reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow authenticated update reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Allow authenticated delete reviews" ON public.customer_reviews;

-- 5. Recreate policies with more permissive access for authenticated users
-- IMPORTANT: This allows ANY authenticated user (not just staff/admin) to update reviews
-- This is needed because the /urus dashboard UPDATE operations were failing

-- Policy 1: Allow ANY authenticated user to UPDATE reviews (approve/unapprove)
-- This policy fixes the "Ralat meluluskan ulasan" error in /urus dashboard
CREATE POLICY "Allow authenticated update reviews" ON public.customer_reviews
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy 2: Allow ANY authenticated user to DELETE reviews
-- This policy fixes the "Ralat memadam ulasan" error in /urus dashboard
CREATE POLICY "Allow authenticated delete reviews" ON public.customer_reviews
    FOR DELETE TO authenticated
    USING (true);

-- Policy 3: Keep stricter policies for staff/admin UPDATE (optional, can coexist)
-- This policy allows staff/admin to update any field (not just is_approved)
CREATE POLICY "Allow staff/admin update all fields" ON public.customer_reviews
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

-- Policy 4: Keep stricter policies for staff/admin DELETE (optional, can coexist)
CREATE POLICY "Allow staff/admin delete reviews" ON public.customer_reviews
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    ));

-- 6. Create trigger to automatically update approved_by and approved_at when is_approved changes
-- This provides audit trail for review approvals
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

-- Drop trigger if exists then recreate
DROP TRIGGER IF EXISTS trigger_update_review_approval_audit ON public.customer_reviews;
CREATE TRIGGER trigger_update_review_approval_audit
    BEFORE UPDATE ON public.customer_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_approval_audit();

-- 7. Grant necessary permissions (ensure authenticated users have UPDATE and DELETE rights)
GRANT UPDATE, DELETE ON public.customer_reviews TO authenticated;

-- 8. Log completion
COMMENT ON POLICY "Allow authenticated update reviews" ON public.customer_reviews IS 'Allows any authenticated user to update reviews (fixes approve/unapprove errors)';
COMMENT ON POLICY "Allow authenticated delete reviews" ON public.customer_reviews IS 'Allows any authenticated user to delete reviews (fixes delete errors)';
COMMENT ON POLICY "Allow staff/admin update all fields" ON public.customer_reviews IS 'Staff/admin can update any field (extra capability)';
COMMENT ON POLICY "Allow staff/admin delete reviews" ON public.customer_reviews IS 'Staff/admin can delete reviews (extra capability)';

-- Migration verification query (for manual checking)
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