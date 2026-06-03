-- Growth Hub: let any authenticated user read all startup profiles.
-- Previously profiles SELECT was limited to own row (+ admins/investors),
-- so founders only saw their own startup on the public Growth Hub page.

DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
