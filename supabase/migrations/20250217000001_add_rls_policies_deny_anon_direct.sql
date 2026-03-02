-- name: rls_deny_anon_direct
-- Migration: Add RLS policies to satisfy security advisor and document intent.
-- The app accesses the database only via Edge Functions using the service role key,
-- which bypasses RLS. These policies explicitly deny direct access via the anon key,
-- so they do not change current app behavior—they add a second layer of security.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

-- customers
CREATE POLICY "no_anon_direct_access"
  ON public.customers FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- category
CREATE POLICY "no_anon_direct_access"
  ON public.category FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- subcategory
CREATE POLICY "no_anon_direct_access"
  ON public.subcategory FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- color
CREATE POLICY "no_anon_direct_access"
  ON public.color FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- size
CREATE POLICY "no_anon_direct_access"
  ON public.size FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- brand
CREATE POLICY "no_anon_direct_access"
  ON public.brand FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- name
CREATE POLICY "no_anon_direct_access"
  ON public.name FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- location
CREATE POLICY "no_anon_direct_access"
  ON public.location FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- inventory_items
CREATE POLICY "no_anon_direct_access"
  ON public.inventory_items FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- rentals
CREATE POLICY "no_anon_direct_access"
  ON public.rentals FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- rental_items
CREATE POLICY "no_anon_direct_access"
  ON public.rental_items FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- payments
CREATE POLICY "no_anon_direct_access"
  ON public.payments FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- rental_events
CREATE POLICY "no_anon_direct_access"
  ON public.rental_events FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- inventory_item_colors
CREATE POLICY "no_anon_direct_access"
  ON public.inventory_item_colors FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- daily_drawers
CREATE POLICY "no_anon_direct_access"
  ON public.daily_drawers FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- drawer_transactions
CREATE POLICY "no_anon_direct_access"
  ON public.drawer_transactions FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- reminder_items
CREATE POLICY "no_anon_direct_access"
  ON public.reminder_items FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- kv_store_918f1e54
CREATE POLICY "no_anon_direct_access"
  ON public.kv_store_918f1e54 FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- payments_methods
CREATE POLICY "no_anon_direct_access"
  ON public.payments_methods FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- drawer_audit_log
CREATE POLICY "no_anon_direct_access"
  ON public.drawer_audit_log FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
