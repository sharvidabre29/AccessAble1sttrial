-- Create conversations table for chat management
BEGIN;

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.service_requests(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  individual_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on request_id for faster queries
CREATE INDEX IF NOT EXISTS conversations_request_id_idx ON public.conversations(request_id);

-- Create index for queries by volunteer_id
CREATE INDEX IF NOT EXISTS conversations_volunteer_id_idx ON public.conversations(volunteer_id);

-- Create index for queries by individual_id
CREATE INDEX IF NOT EXISTS conversations_individual_id_idx ON public.conversations(individual_id);

-- Add conversation_id to messages table if not exists
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Add foreign key constraints to sender and receiver if not exists
ALTER TABLE public.messages
  ADD CONSTRAINT IF NOT EXISTS messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT IF NOT EXISTS messages_receiver_id_fkey 
  FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create index for messages by conversation_id
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);

-- Create index for sender and receiver for fast lookups
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);

-- Add timestamp tracking to messages if not exists
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Service can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;

-- RLS Policy: Users can view conversations they participate in
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = volunteer_id OR auth.uid() = individual_id
  );

-- RLS Policy: Only system can create conversations (or via trigger)
CREATE POLICY "Service can insert conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS Policy: Users can update conversations they participate in
CREATE POLICY "Users can update their conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = volunteer_id OR auth.uid() = individual_id
  );

-- Enable RLS on messages if not already
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- Allow authenticated users to insert messages into their conversations
CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Allow users to update messages they received
CREATE POLICY "Users can mark messages as read" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    receiver_id = auth.uid()
  );

COMMIT;
