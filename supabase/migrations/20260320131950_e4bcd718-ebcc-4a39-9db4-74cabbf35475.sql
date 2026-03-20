INSERT INTO public.user_roles (user_id, role, approved)
VALUES ('2d7a0579-72de-44fe-9d59-d94f72daedfd', 'admin', true)
ON CONFLICT (user_id, role) DO UPDATE SET approved = true;