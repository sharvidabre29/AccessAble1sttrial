BEGIN;

DROP POLICY IF EXISTS "Authenticated can view organization profiles" ON public.profiles;

CREATE POLICY "Authenticated can view organization profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'organization'::public.app_role OR auth.uid() = id
  );

COMMIT;
