-- Add country and industry to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry text DEFAULT '';

-- Add contact_email and approved to startup_vacancies
ALTER TABLE public.startup_vacancies ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '';
ALTER TABLE public.startup_vacancies ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Update handle_new_user to include country, industry, and auto investor role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, surname, startup_name, startup_description, country, industry)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'surname', ''),
    COALESCE(NEW.raw_user_meta_data->>'startup_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'startup_description', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    COALESCE(NEW.raw_user_meta_data->>'industry', '')
  );

  -- Auto-assign investor role if registered as investor
  IF NEW.raw_user_meta_data->>'is_investor' = 'true' THEN
    INSERT INTO public.user_roles (user_id, role, approved)
    VALUES (NEW.id, 'investor', false)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Admin delete policies for cascade startup deletion
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete evaluations" ON public.evaluations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete readiness" ON public.readiness_answers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete snapshots" ON public.financial_snapshots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update and delete vacancies (for approval flow)
CREATE POLICY "Admins can update vacancies" ON public.startup_vacancies FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete vacancies" ON public.startup_vacancies FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));