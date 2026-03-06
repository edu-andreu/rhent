-- Migration: Add app_users table for role-based access control
-- Links to auth.users via foreign key; first user auto-promoted to admin via trigger.

CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger function: auto-create app_users row when a new auth.users row is inserted.
-- First user ever gets 'admin'; subsequent users get 'employee'.
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

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own row
CREATE POLICY "Users can read own profile"
    ON public.app_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Service role bypasses RLS, so Edge Functions can manage all rows.
-- No INSERT/UPDATE/DELETE policies for authenticated role (managed server-side).

-- Updated_at auto-update trigger
CREATE OR REPLACE FUNCTION public.update_app_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER app_users_updated_at
    BEFORE UPDATE ON public.app_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_app_users_updated_at();
