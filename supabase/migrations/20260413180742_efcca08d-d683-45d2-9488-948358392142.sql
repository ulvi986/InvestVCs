ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_company TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS linkedin_url TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    surname,
    startup_name,
    startup_description,
    country,
    industry,
    email,
    current_company,
    linkedin_url
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
  END IF;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Investors can update their own interests" ON public.funding_interests;
CREATE POLICY "Investors can update their own interests"
ON public.funding_interests
FOR UPDATE
TO authenticated
USING (auth.uid() = investor_user_id)
WITH CHECK (auth.uid() = investor_user_id);

CREATE OR REPLACE FUNCTION public.sync_startup_interest_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_startup_id uuid;
  previous_startup_id uuid;
BEGIN
  current_startup_id := CASE WHEN TG_OP <> 'DELETE' THEN NEW.startup_user_id ELSE NULL END;
  previous_startup_id := CASE WHEN TG_OP <> 'INSERT' THEN OLD.startup_user_id ELSE NULL END;

  IF previous_startup_id IS NOT NULL THEN
    UPDATE public.startup_funding
    SET interest_count = (
      SELECT COUNT(*)::int
      FROM public.funding_interests
      WHERE startup_user_id = previous_startup_id
    ),
    updated_at = now()
    WHERE user_id = previous_startup_id;

    IF NOT FOUND THEN
      INSERT INTO public.startup_funding (user_id, interest_count)
      VALUES (
        previous_startup_id,
        (
          SELECT COUNT(*)::int
          FROM public.funding_interests
          WHERE startup_user_id = previous_startup_id
        )
      );
    END IF;
  END IF;

  IF current_startup_id IS NOT NULL AND current_startup_id IS DISTINCT FROM previous_startup_id THEN
    UPDATE public.startup_funding
    SET interest_count = (
      SELECT COUNT(*)::int
      FROM public.funding_interests
      WHERE startup_user_id = current_startup_id
    ),
    updated_at = now()
    WHERE user_id = current_startup_id;

    IF NOT FOUND THEN
      INSERT INTO public.startup_funding (user_id, interest_count)
      VALUES (
        current_startup_id,
        (
          SELECT COUNT(*)::int
          FROM public.funding_interests
          WHERE startup_user_id = current_startup_id
        )
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS sync_startup_interest_count_trigger ON public.funding_interests;
CREATE TRIGGER sync_startup_interest_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.funding_interests
FOR EACH ROW
EXECUTE FUNCTION public.sync_startup_interest_count();

INSERT INTO public.startup_funding (user_id, interest_count)
SELECT grouped.startup_user_id, grouped.cnt
FROM (
  SELECT startup_user_id, COUNT(*)::int AS cnt
  FROM public.funding_interests
  GROUP BY startup_user_id
) AS grouped
WHERE NOT EXISTS (
  SELECT 1
  FROM public.startup_funding sf
  WHERE sf.user_id = grouped.startup_user_id
);

UPDATE public.startup_funding sf
SET interest_count = grouped.cnt,
    updated_at = now()
FROM (
  SELECT startup_user_id, COUNT(*)::int AS cnt
  FROM public.funding_interests
  GROUP BY startup_user_id
) AS grouped
WHERE sf.user_id = grouped.startup_user_id;

UPDATE public.startup_funding
SET interest_count = 0,
    updated_at = now()
WHERE user_id NOT IN (
  SELECT DISTINCT startup_user_id
  FROM public.funding_interests
);