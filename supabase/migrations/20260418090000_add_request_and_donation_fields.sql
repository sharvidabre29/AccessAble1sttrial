-- Migration: add request and donation fields, FK cascade, and RLS policies
BEGIN;

-- Add columns to service_requests
ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'volunteer',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS funding_goal INTEGER,
  ADD COLUMN IF NOT EXISTS funding_raised INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_details TEXT,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Ensure created_by and assigned_to reference auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'service_requests' AND c.conname = 'service_requests_created_by_fkey'
  ) THEN
    ALTER TABLE public.service_requests
      ADD CONSTRAINT service_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'service_requests' AND c.conname = 'service_requests_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.service_requests
      ADD CONSTRAINT service_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Add donation columns
ALTER TABLE IF EXISTS public.donations
  ADD COLUMN IF NOT EXISTS donation_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS donor_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'donations' AND c.conname = 'donations_request_id_fkey'
  ) THEN
    ALTER TABLE public.donations
      ADD CONSTRAINT donations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'donations' AND c.conname = 'donations_donor_id_fkey'
  ) THEN
    ALTER TABLE public.donations
      ADD CONSTRAINT donations_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Ensure volunteer_assignments (or request_volunteers) cascade on request delete
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'volunteer_assignments') THEN
    ALTER TABLE public.volunteer_assignments
      DROP CONSTRAINT IF EXISTS volunteer_assignments_request_id_fkey;
    ALTER TABLE public.volunteer_assignments
      ADD CONSTRAINT volunteer_assignments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Row Level Security: enable and policies
-- service_requests
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
-- Allow authenticated users to insert
CREATE POLICY IF NOT EXISTS "service_requests_insert_authenticated" ON public.service_requests FOR INSERT USING (auth.role() IS NOT NULL) WITH CHECK (auth.role() IS NOT NULL);
-- Allow creators to delete their own requests
CREATE POLICY IF NOT EXISTS "service_requests_delete_creator" ON public.service_requests FOR DELETE USING (created_by = auth.uid());
-- Allow creators to update any of their fields
CREATE POLICY IF NOT EXISTS "service_requests_update_creator" ON public.service_requests FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
-- Allow volunteers to accept a task: they may set assigned_to = auth.uid() and status = 'accepted' only via a limited update policy
CREATE POLICY IF NOT EXISTS "service_requests_update_volunteer_accept" ON public.service_requests FOR UPDATE
  USING (true)
  WITH CHECK ( (assigned_to = auth.uid() AND status = 'accepted') OR (created_by = auth.uid()) );
-- Allow organizations (creators) to update funding_raised/status related fields
CREATE POLICY IF NOT EXISTS "service_requests_update_org_funding" ON public.service_requests FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
-- Allow authenticated users to insert donations (donor_id must be auth.uid())
CREATE POLICY IF NOT EXISTS "donations_insert_authenticated" ON public.donations FOR INSERT USING (auth.role() IS NOT NULL) WITH CHECK (donor_id = auth.uid());
-- Allow donors to view their donations
CREATE POLICY IF NOT EXISTS "donations_select_owner" ON public.donations FOR SELECT USING (donor_id = auth.uid());
-- Allow orgs to update donation status if they are the request creator (join check via EXISTS)
CREATE POLICY IF NOT EXISTS "donations_update_org" ON public.donations FOR UPDATE USING (EXISTS (SELECT 1 FROM public.service_requests WHERE service_requests.id = donations.request_id AND service_requests.created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.service_requests WHERE service_requests.id = donations.request_id AND service_requests.created_by = auth.uid()));

COMMIT;
