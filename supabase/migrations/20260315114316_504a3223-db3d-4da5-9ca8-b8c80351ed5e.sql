
-- Add category and urgency to service_requests
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'medium';

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own received messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);
