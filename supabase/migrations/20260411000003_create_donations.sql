-- Migration: create donations table and ensure funding fields on service_requests

-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id uuid NOT NULL,
  request_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  donation_type text,
  created_at timestamptz DEFAULT now()
);

-- Foreign key to service_requests (if service_requests exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'service_requests') THEN
    ALTER TABLE public.donations
      ADD CONSTRAINT IF NOT EXISTS donations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Ensure funding_raised column exists on service_requests
ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS funding_raised numeric DEFAULT 0;

-- Ensure funding_goal column exists
ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS funding_goal numeric DEFAULT 0;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_donations_request_id ON public.donations(request_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
