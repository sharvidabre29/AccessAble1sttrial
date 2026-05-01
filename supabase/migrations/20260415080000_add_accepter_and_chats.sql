-- Add accepter_id and chat_id to service_requests and create chats table
BEGIN;

ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS accepter_id uuid;

ALTER TABLE IF EXISTS public.service_requests
  ADD COLUMN IF NOT EXISTS chat_id uuid;

CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
  participant_a uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  participant_b uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: allow selecting chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

COMMIT;
