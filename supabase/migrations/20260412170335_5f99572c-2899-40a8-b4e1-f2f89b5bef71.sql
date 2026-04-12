
CREATE POLICY "Authenticated users can read all funding"
ON public.startup_funding
FOR SELECT
TO authenticated
USING (true);
