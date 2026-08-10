-- Make the default ("normal") registration an explicit STARTUP account.
--
-- Previously handle_new_user() only assigned a role for investors and job
-- seekers, so a normal startup founder ended up with NO row in user_roles.
-- The app treated "no role" as startup implicitly, which was fragile.
-- We now assign the 'startup' role explicitly for any signup that is neither
-- an investor nor a job seeker, while keeping the job-seeker ('user') branch.

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
    ELSE
      -- Default / normal registration => startup account.
      INSERT INTO public.user_roles (user_id, role, approved)
      VALUES (NEW.id, 'startup', true)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: role assignment failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- Backfill: existing founders who registered before this migration have no
-- role row. Give every profile without an investor/user/startup role the
-- startup role so the app treats them consistently.
INSERT INTO public.user_roles (user_id, role, approved)
SELECT p.id, 'startup', true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;
