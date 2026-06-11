-- Allow founders (any authenticated user) to see the list of approved
-- investors with their public profile info. user_roles RLS only exposes a
-- user's own roles, so we use a SECURITY DEFINER function that returns only
-- approved investors' public profile fields.
CREATE OR REPLACE FUNCTION public.list_investors()
RETURNS TABLE (
  id uuid,
  name text,
  surname text,
  avatar_url text,
  linkedin_url text,
  current_company text,
  industry text,
  country text,
  email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.name, p.surname, p.avatar_url, p.linkedin_url,
         p.current_company, p.industry, p.country, p.email
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'investor' AND ur.approved = true
  ORDER BY p.name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.list_investors() TO authenticated;
