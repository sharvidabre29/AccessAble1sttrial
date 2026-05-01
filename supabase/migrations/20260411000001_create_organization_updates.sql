-- Create organization_updates table for uploads and proof images
BEGIN;

CREATE TABLE IF NOT EXISTS organization_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  image_url text,
  description text,
  created_at timestamptz DEFAULT now()
);

COMMIT;
