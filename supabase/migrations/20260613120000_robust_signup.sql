-- Make job-seeker / investor signup robust.
--
-- Root cause of the registration failure: the 'user' value may be missing from
-- the app_role enum, so the role INSERT in handle_new_user() raised and aborted
-- the whole auth signup. We (1) ensure the enum value exists and (2) isolate the
-- role assignment in its own exception block so a role-insert problem can never
-- block account/profile creation again.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

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
  )
  ON CONFLICT (id) DO NOTHING;

  -- Role assignment must never abort signup; isolate any failure.
  BEGIN
    IF NEW.raw_user_meta_data->>'is_investor' = 'true' THEN
      INSERT INTO public.user_roles (user_id, role, approved)
      VALUES (NEW.id, 'investor', false)
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSIF NEW.raw_user_meta_data->>'is_job_seeker' = 'true' THEN
      INSERT INTO public.user_roles (user_id, role, approved)
      VALUES (NEW.id, 'user', true)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: role assignment failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
