-- Create request_volunteers table
CREATE TABLE IF NOT EXISTS public.request_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  volunteer_id uuid NOT NULL,
  hours_contributed numeric,
  contribution_type text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT request_volunteers_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.service_requests(id)
);
