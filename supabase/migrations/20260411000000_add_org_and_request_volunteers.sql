-- Add organization fields and request volunteers
BEGIN;

-- Add registration_id and is_verified to organizations if not exist
ALTER TABLE IF EXISTS organizations
  ADD COLUMN IF NOT EXISTS registration_id text;

ALTER TABLE IF EXISTS organizations
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Add volunteers_required, required_volunteer_hours, funding_goal, status to service_requests
ALTER TABLE IF EXISTS service_requests
  ADD COLUMN IF NOT EXISTS volunteers_required integer DEFAULT 0;

ALTER TABLE IF EXISTS service_requests
  ADD COLUMN IF NOT EXISTS required_volunteer_hours integer DEFAULT 0;

ALTER TABLE IF EXISTS service_requests
  ADD COLUMN IF NOT EXISTS funding_goal numeric DEFAULT 0;

ALTER TABLE IF EXISTS service_requests
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Create request_volunteers table
CREATE TABLE IF NOT EXISTS request_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE,
  volunteer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  hours_contributed integer,
  contribution_type text,
  notes text,
  created_at timestamptz DEFAULT now()
);

COMMIT;
