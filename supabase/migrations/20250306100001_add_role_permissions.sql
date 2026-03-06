-- Migration: Role-based permissions (tabs + actions).
-- permission_key: tab:<id> for nav tabs, action:move_money, action:view_cash_drawer_history for actions.

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  PRIMARY KEY (role, permission_key),
  CHECK (role IN ('admin', 'employee', 'owner'))
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_anon_direct_access"
  ON public.role_permissions FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Seed defaults: owner = all; admin = same as owner; employee = limited tabs, no actions.
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('owner', 'tab:dashboard'),
  ('owner', 'tab:catalog'),
  ('owner', 'tab:rentals'),
  ('owner', 'tab:reservations'),
  ('owner', 'tab:customers'),
  ('owner', 'tab:cash'),
  ('owner', 'tab:settings'),
  ('owner', 'action:move_money'),
  ('owner', 'action:view_cash_drawer_history'),
  ('admin', 'tab:dashboard'),
  ('admin', 'tab:catalog'),
  ('admin', 'tab:rentals'),
  ('admin', 'tab:reservations'),
  ('admin', 'tab:customers'),
  ('admin', 'tab:cash'),
  ('admin', 'tab:settings'),
  ('admin', 'action:move_money'),
  ('admin', 'action:view_cash_drawer_history'),
  ('employee', 'tab:catalog'),
  ('employee', 'tab:rentals'),
  ('employee', 'tab:reservations'),
  ('employee', 'tab:customers'),
  ('employee', 'tab:cash')
ON CONFLICT (role, permission_key) DO NOTHING;
