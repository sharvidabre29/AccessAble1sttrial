-- Add DELETE policy for service_requests to allow creators to delete their own requests
CREATE POLICY "Creator can delete own requests"
  ON public.service_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
