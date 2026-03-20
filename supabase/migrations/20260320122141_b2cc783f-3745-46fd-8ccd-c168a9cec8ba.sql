
INSERT INTO public.user_roles (user_id, role, approved)
VALUES ('8166044e-e61c-4a6e-a47e-edc09d977484', 'admin', true)
ON CONFLICT (user_id, role) DO NOTHING;
