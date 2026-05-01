-- Migration: Fix RLS for service_requests and add missing columns + cascade FKs
BEGIN;

-- Add missing columns to service_requests
ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS deadline timestamptz;

ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS request_type text;

ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS qr_code_url text;

ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS bank_details jsonb;

-- Ensure funding_raised/funding_goal exist (no-op if present)
ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS funding_goal numeric DEFAULT 0;

ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS funding_raised numeric DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_requests_deadline ON public.service_requests(deadline);

-- Ensure donations.request_id and volunteer_assignments request_id have ON DELETE CASCADE (should already exist)
-- Recreate foreign key constraints if missing: skip if already defined

-- Drop restrictive update policy so we can replace it
DROP POLICY IF EXISTS "Creator can update own requests" ON public.service_requests;

-- Policy: creators can fully update their own requests
CREATE POLICY "Creator can update own requests"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: allow assigned volunteer (or volunteer assignment owner) to update assignment-related fields (assigned_to, status, chat_id)
DROP POLICY IF EXISTS "Allow assigned volunteers to update" ON public.service_requests;
CREATE POLICY "Allow assigned volunteers to update"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM public.volunteer_assignments va WHERE va.request_id = public.service_requests.id AND va.volunteer_id = auth.uid()
    )
  )
  WITH CHECK (
    -- only allow these volunteers to change assignment-related columns
    (auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM public.volunteer_assignments va WHERE va.request_id = public.service_requests.id AND va.volunteer_id = auth.uid()))
    AND (
      (title IS NOT DISTINCT FROM OLD.title)
      AND (description IS NOT DISTINCT FROM OLD.description)
      AND (location IS NOT DISTINCT FROM OLD.location)
      AND (skills_needed IS NOT DISTINCT FROM OLD.skills_needed)
      AND (funding_goal IS NOT DISTINCT FROM OLD.funding_goal)
      AND (request_type IS NOT DISTINCT FROM OLD.request_type)
      AND (qr_code_url IS NOT DISTINCT FROM OLD.qr_code_url)
      AND (bank_details IS NOT DISTINCT FROM OLD.bank_details)
      -- allow status, assigned_to, chat_id, funding_raised and updated_at to change
    )
  );

-- Policy: allow donors (or anyone) to update only funding_raised (and updated_at) so donation flows can recompute totals client-side
DROP POLICY IF EXISTS "Allow funding updates" ON public.service_requests;
CREATE POLICY "Allow funding updates"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    (
      -- if not creator, ensure only funding_raised and updated_at changed
      auth.uid() = created_by
    )
    OR (
      -- allow update when only funding_raised (and updated_at) differ from OLD
      (title IS NOT DISTINCT FROM OLD.title)
      AND (description IS NOT DISTINCT FROM OLD.description)
      AND (location IS NOT DISTINCT FROM OLD.location)
      AND (skills_needed IS NOT DISTINCT FROM OLD.skills_needed)
      AND (funding_goal IS NOT DISTINCT FROM OLD.funding_goal)
      AND (request_type IS NOT DISTINCT FROM OLD.request_type)
      AND (qr_code_url IS NOT DISTINCT FROM OLD.qr_code_url)
      AND (bank_details IS NOT DISTINCT FROM OLD.bank_details)
      AND (assigned_to IS NOT DISTINCT FROM OLD.assigned_to)
      AND (status IS NOT DISTINCT FROM OLD.status)
      AND (chat_id IS NOT DISTINCT FROM OLD.chat_id)
      -- allow funding_raised to be different
      -- updated_at may change, ignore it
    )
  );

-- Ensure donations.request_id FK has ON DELETE CASCADE (idempotent: drop+recreate if necessary)
ALTER TABLE IF EXISTS public.donations DROP CONSTRAINT IF EXISTS donations_request_id_fkey;
ALTER TABLE IF EXISTS public.donations
  ADD CONSTRAINT donations_request_id_fkey FOREIGN KEY (request_id)
  REFERENCES public.service_requests(id) ON DELETE CASCADE;

-- Ensure volunteer_assignments.request_id FK has ON DELETE CASCADE
ALTER TABLE IF EXISTS public.volunteer_assignments DROP CONSTRAINT IF EXISTS volunteer_assignments_request_id_fkey;
ALTER TABLE IF EXISTS public.volunteer_assignments
  ADD CONSTRAINT volunteer_assignments_request_id_fkey FOREIGN KEY (request_id)
  REFERENCES public.service_requests(id) ON DELETE CASCADE;

COMMIT;
