-- Keep service_requests.updated_at current on every update
CREATE OR REPLACE FUNCTION public.set_service_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER set_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_service_requests_updated_at();
