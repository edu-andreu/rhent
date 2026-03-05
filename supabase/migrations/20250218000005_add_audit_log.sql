-- name: add_audit_log
-- Migration: Create a centralized, append-only audit_log table with automatic
-- triggers on all critical business tables.
--
-- Captures INSERT, UPDATE, and DELETE operations with old/new data snapshots,
-- the acting user (from created_by/updated_by columns), and the table/row affected.
--
-- Tables audited:
--   rentals, rental_items, payments, customers, inventory_items,
--   daily_drawers, drawer_transactions, store_credit_ledger,
--   category, location, payments_methods
--
-- Existing domain-specific audit mechanisms (rental_events, drawer_audit_log,
-- store_credit_ledger) are preserved — this is a complementary, centralized log.

-- ============================================================================
-- 1. Create the audit_log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  action        text        NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  entity_type   text        NOT NULL,  -- table name, e.g. 'rentals'
  entity_id     text,                  -- PK of the affected row (text for flexibility)
  actor         text,                  -- value from created_by / updated_by / opened_by
  old_data      jsonb,                 -- row state before change (UPDATE/DELETE)
  new_data      jsonb,                 -- row state after change  (INSERT/UPDATE)
  changed_fields text[],              -- list of columns that changed (UPDATE only)
  metadata      jsonb                  -- extra context (trigger name, etc.)
);

-- Append-only: no UPDATE or DELETE allowed via RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_anon_direct_access" ON public.audit_log;
CREATE POLICY "no_anon_direct_access"
  ON public.audit_log FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 2. Indexes for common query patterns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log (actor)
  WHERE actor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_action_entity
  ON public.audit_log (action, entity_type);

-- ============================================================================
-- 3. Generic trigger function
-- ============================================================================
-- Extracts the primary key value and the actor from common column patterns.
-- Works for tables with PK named 'id', 'customer_id', 'drawer_id', or 'drawer_txn_id'.
CREATE OR REPLACE FUNCTION fn_audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entity_id   text;
  v_actor       text;
  v_old_data    jsonb;
  v_new_data    jsonb;
  v_changed     text[];
  v_key         text;
BEGIN
  -- Determine the primary key value
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;

    v_entity_id := COALESCE(
      v_old_data ->> 'id',
      v_old_data ->> 'customer_id',
      v_old_data ->> 'drawer_id',
      v_old_data ->> 'drawer_txn_id'
    );

    v_actor := COALESCE(
      v_old_data ->> 'updated_by',
      v_old_data ->> 'created_by',
      v_old_data ->> 'opened_by'
    );
  ELSE
    v_new_data := to_jsonb(NEW);

    IF TG_OP = 'UPDATE' THEN
      v_old_data := to_jsonb(OLD);
    END IF;

    v_entity_id := COALESCE(
      v_new_data ->> 'id',
      v_new_data ->> 'customer_id',
      v_new_data ->> 'drawer_id',
      v_new_data ->> 'drawer_txn_id'
    );

    v_actor := COALESCE(
      v_new_data ->> 'updated_by',
      v_new_data ->> 'created_by',
      v_new_data ->> 'opened_by'
    );
  END IF;

  -- Only log when a user performed the action (skip system/migration)
  IF v_actor IS NULL OR v_actor IN ('system', 'migration') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- For UPDATE, compute which columns changed
  IF TG_OP = 'UPDATE' THEN
    v_changed := ARRAY[]::text[];
    FOR v_key IN SELECT jsonb_object_keys(v_new_data)
    LOOP
      IF v_old_data -> v_key IS DISTINCT FROM v_new_data -> v_key THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;

    -- Skip logging if nothing actually changed (e.g. idempotent update)
    IF array_length(v_changed, 1) IS NULL THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;

    -- Skip logging if only metadata columns changed (updated_at, updated_by)
    IF v_changed <@ ARRAY['updated_at', 'updated_by']::text[] THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_log (action, entity_type, entity_id, actor, old_data, new_data, changed_fields, metadata)
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    v_entity_id,
    v_actor,
    v_old_data,
    v_new_data,
    v_changed,
    jsonb_build_object('trigger', TG_NAME, 'schema', TG_TABLE_SCHEMA)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================================================
-- 4. Attach triggers to critical business tables
-- ============================================================================

-- rentals
DROP TRIGGER IF EXISTS trg_audit_log_rentals ON public.rentals;
CREATE TRIGGER trg_audit_log_rentals
  AFTER INSERT OR UPDATE OR DELETE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- rental_items
DROP TRIGGER IF EXISTS trg_audit_log_rental_items ON public.rental_items;
CREATE TRIGGER trg_audit_log_rental_items
  AFTER INSERT OR UPDATE OR DELETE ON public.rental_items
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- payments
DROP TRIGGER IF EXISTS trg_audit_log_payments ON public.payments;
CREATE TRIGGER trg_audit_log_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- customers
DROP TRIGGER IF EXISTS trg_audit_log_customers ON public.customers;
CREATE TRIGGER trg_audit_log_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- inventory_items
DROP TRIGGER IF EXISTS trg_audit_log_inventory_items ON public.inventory_items;
CREATE TRIGGER trg_audit_log_inventory_items
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- daily_drawers
DROP TRIGGER IF EXISTS trg_audit_log_daily_drawers ON public.daily_drawers;
CREATE TRIGGER trg_audit_log_daily_drawers
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_drawers
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- drawer_transactions
DROP TRIGGER IF EXISTS trg_audit_log_drawer_transactions ON public.drawer_transactions;
CREATE TRIGGER trg_audit_log_drawer_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.drawer_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- store_credit_ledger
DROP TRIGGER IF EXISTS trg_audit_log_store_credit_ledger ON public.store_credit_ledger;
CREATE TRIGGER trg_audit_log_store_credit_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.store_credit_ledger
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- category
DROP TRIGGER IF EXISTS trg_audit_log_category ON public.category;
CREATE TRIGGER trg_audit_log_category
  AFTER INSERT OR UPDATE OR DELETE ON public.category
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- location
DROP TRIGGER IF EXISTS trg_audit_log_location ON public.location;
CREATE TRIGGER trg_audit_log_location
  AFTER INSERT OR UPDATE OR DELETE ON public.location
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- payments_methods
DROP TRIGGER IF EXISTS trg_audit_log_payments_methods ON public.payments_methods;
CREATE TRIGGER trg_audit_log_payments_methods
  AFTER INSERT OR UPDATE OR DELETE ON public.payments_methods
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

-- ============================================================================
-- 5. Helper view for recent audit activity
-- ============================================================================
CREATE OR REPLACE VIEW public.v_audit_log_recent AS
SELECT
  id,
  created_at,
  action,
  entity_type,
  entity_id,
  actor,
  changed_fields,
  metadata
FROM public.audit_log
ORDER BY created_at DESC;

-- ============================================================================
-- 6. Comments
-- ============================================================================
COMMENT ON TABLE public.audit_log IS
  'Centralized, append-only audit trail for all critical business table changes. '
  'Populated automatically via AFTER triggers. Do not UPDATE or DELETE rows.';

COMMENT ON COLUMN public.audit_log.action IS 'SQL operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN public.audit_log.entity_type IS 'Source table name (e.g. rentals, payments)';
COMMENT ON COLUMN public.audit_log.entity_id IS 'Primary key of the affected row, cast to text';
COMMENT ON COLUMN public.audit_log.actor IS 'Who performed the action (from created_by/updated_by columns)';
COMMENT ON COLUMN public.audit_log.old_data IS 'Full row as JSONB before the change (UPDATE/DELETE)';
COMMENT ON COLUMN public.audit_log.new_data IS 'Full row as JSONB after the change (INSERT/UPDATE)';
COMMENT ON COLUMN public.audit_log.changed_fields IS 'Array of column names that changed (UPDATE only)';
COMMENT ON COLUMN public.audit_log.metadata IS 'Extra context: trigger name, schema, etc.';
