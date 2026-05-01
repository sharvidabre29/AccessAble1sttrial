-- Add requester_id and assigned_to to service_requests
BEGIN;

ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES auth.users(id);

ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Optional indexes to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_service_requests_requester_id ON public.service_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to ON public.service_requests(assigned_to);

COMMIT;
