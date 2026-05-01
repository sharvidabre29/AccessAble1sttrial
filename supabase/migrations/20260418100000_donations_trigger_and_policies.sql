-- Migration: donations trigger to update funding_raised and RLS policies
BEGIN;

-- Ensure donations has expected columns
ALTER TABLE IF EXISTS public.donations
  ALTER COLUMN IF EXISTS amount TYPE integer USING (amount::integer),
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS donor_id uuid,
  ALTER COLUMN IF EXISTS created_at SET DEFAULT now(),
  ALTER COLUMN IF EXISTS status SET DEFAULT 'pending';

-- Ensure foreign keys
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

-- Function to recompute funding for a request when a donation becomes verified
CREATE OR REPLACE FUNCTION public.update_amount_raised()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when request exists
  UPDATE public.service_requests
  SET funding_raised = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.donations
    WHERE donations.request_id = NEW.request_id AND donations.status = 'verified'
  )
  WHERE id = NEW.request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: after insert or status update to 'verified'
DROP TRIGGER IF EXISTS donation_update_trigger ON public.donations;
CREATE TRIGGER donation_update_trigger
AFTER INSERT OR UPDATE OF status ON public.donations
FOR EACH ROW
WHEN (NEW.status = 'verified')
EXECUTE FUNCTION public.update_amount_raised();

-- RLS: donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Donor can insert only their own donation and must set status = 'pending'
CREATE POLICY IF NOT EXISTS donor_insert_donation ON public.donations FOR INSERT TO public.authenticated
  WITH CHECK (donor_id = auth.uid() AND (status IS NULL OR status = 'pending'));

-- Donor can select their own donations
CREATE POLICY IF NOT EXISTS donor_view_own ON public.donations FOR SELECT TO public.authenticated
  USING (donor_id = auth.uid());

-- Organization (request creator) can view donations for their requests
CREATE POLICY IF NOT EXISTS org_view_donations ON public.donations FOR SELECT TO public.authenticated
  USING (EXISTS (SELECT 1 FROM public.service_requests WHERE service_requests.id = donations.request_id AND service_requests.created_by = auth.uid()));

-- Organization can update status to 'verified' for donations belonging to their requests
CREATE POLICY IF NOT EXISTS org_verify_donations ON public.donations FOR UPDATE TO public.authenticated
  USING (EXISTS (SELECT 1 FROM public.service_requests WHERE service_requests.id = donations.request_id AND service_requests.created_by = auth.uid()))
  WITH CHECK (status IN ('verified'));

COMMIT;
