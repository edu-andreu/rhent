-- Migration: Add 'owner' role. First user still gets 'admin', subsequent users get 'employee'.
-- Only Admin and Owner can change roles (enforced in app).

-- 1. Allow 'owner' in app_users.role
ALTER TABLE public.app_users
  DROP CONSTRAINT IF EXISTS app_users_role_check;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_role_check CHECK (role IN ('admin', 'employee', 'owner'));

-- 2. First user gets 'admin', every other new user gets 'employee'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role TEXT;
BEGIN
  SELECT count(*) INTO user_count FROM public.app_users;

  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'employee';
  END IF;

  INSERT INTO public.app_users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    assigned_role
  );
  RETURN NEW;
END;
$$;
