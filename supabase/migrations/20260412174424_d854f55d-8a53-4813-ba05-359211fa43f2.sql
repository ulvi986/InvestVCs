
-- Admin can read all funding interests
CREATE POLICY "Admins can read all funding interests"
  ON public.funding_interests FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update funding interests (approve)
CREATE POLICY "Admins can update funding interests"
  ON public.funding_interests FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete funding interests (reject)
CREATE POLICY "Admins can delete funding interests"
  ON public.funding_interests FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
