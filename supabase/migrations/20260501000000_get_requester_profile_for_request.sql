BEGIN;

CREATE OR REPLACE FUNCTION public.get_requester_profile_for_request(request_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  role app_role,
  address text,
  avatar_url text,
  individual_type individual_type,
  accessibility_needs text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.role,
    p.address,
    p.avatar_url,
    p.individual_type,
    p.accessibility_needs
  FROM public.service_requests sr
  JOIN public.profiles p ON p.id = sr.created_by
  WHERE sr.id = request_id
    AND p.role = 'individual'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_requester_profile_for_request(uuid) TO authenticated;

COMMIT;