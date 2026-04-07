-- Add preferred_contact_method to service_requests
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email';

-- Create contact method enum
CREATE TYPE public.contact_method AS ENUM ('email', 'phone', 'chat');

-- Alter column to use the enum
ALTER TABLE public.service_requests ALTER COLUMN preferred_contact_method SET DATA TYPE contact_method USING 'email'::contact_method;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
  related_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_status boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification read status"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx ON public.notifications(user_id, read_status, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
