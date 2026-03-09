-- Add action:view_edit_settings (Settings moved from visible tabs to actions).
-- Add dashboard sub-tab permissions so employees can see Dashboard with only Sales.
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('owner', 'action:view_edit_settings'),
  ('admin', 'action:view_edit_settings'),
  ('owner', 'tab:dashboard:sales'),
  ('owner', 'tab:dashboard:expenses'),
  ('owner', 'tab:dashboard:money'),
  ('admin', 'tab:dashboard:sales'),
  ('admin', 'tab:dashboard:expenses'),
  ('admin', 'tab:dashboard:money'),
  ('employee', 'tab:dashboard'),
  ('employee', 'tab:dashboard:sales')
ON CONFLICT (role, permission_key) DO NOTHING;
