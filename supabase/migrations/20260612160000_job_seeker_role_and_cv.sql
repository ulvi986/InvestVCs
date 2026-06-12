-- Job-seeker ("user") role support + CV storage + matching helper.
-- NOTE: run `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';`
-- on its own FIRST (enum values can't be added and used in one transaction).

-- Assign the 'user' role on signup when the signup metadata marks a job seeker.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, name, surname, startup_name, startup_description,
    country, industry, email, current_company, linkedin_url
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'surname', ''),
    COALESCE(NEW.raw_user_meta_data->>'startup_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'startup_description', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    COALESCE(NEW.raw_user_meta_data->>'industry', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'current_company', ''),
    COALESCE(NEW.raw_user_meta_data->>'linkedin_url', '')
  );

  IF NEW.raw_user_meta_data->>'is_investor' = 'true' THEN
    INSERT INTO public.user_roles (user_id, role, approved)
    VALUES (NEW.id, 'investor', false)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.raw_user_meta_data->>'is_job_seeker' = 'true' THEN
    INSERT INTO public.user_roles (user_id, role, approved)
    VALUES (NEW.id, 'user', true)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- CV metadata table (one CV per user; file lives in the private 'cvs' bucket).
CREATE TABLE IF NOT EXISTS public.user_cvs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  extracted_text text,
  skills text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_cvs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own CV" ON public.user_cvs;
CREATE POLICY "Users manage own CV"
  ON public.user_cvs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Private storage bucket for CV files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own CV" ON storage.objects;
CREATE POLICY "Users upload own CV"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users read own CV" ON storage.objects;
CREATE POLICY "Users read own CV"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own CV" ON storage.objects;
CREATE POLICY "Users update own CV"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own CV" ON storage.objects;
CREATE POLICY "Users delete own CV"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
