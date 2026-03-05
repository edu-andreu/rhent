-- name: add_drawer_transaction_categories
-- Migration: Add transaction categories for cash drawer (Expense/Payroll support)
--
-- Creates a reference table for transaction categories (e.g. Edemsa, Ecogas, Vuelto)
-- filtered by direction (in/out). Also extends drawer_transactions with category,
-- cash_out_type (expense/payroll), and payroll-specific columns.

BEGIN;

-- ============================================================================
-- 1. Create drawer_transaction_categories table
-- ============================================================================

CREATE TABLE public.drawer_transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, direction)
);

ALTER TABLE public.drawer_transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_anon_direct_access"
  ON public.drawer_transaction_categories FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 2. Seed default categories
-- ============================================================================

INSERT INTO public.drawer_transaction_categories (name, direction) VALUES
  ('Vuelto', 'in'),
  ('Otro',   'in'),
  ('Edemsa',  'out'),
  ('Ecogas',  'out'),
  ('Aysam',   'out'),
  ('Modista', 'out'),
  ('Otro',    'out');

-- ============================================================================
-- 3. Alter drawer_transactions with new columns
-- ============================================================================

ALTER TABLE public.drawer_transactions
  ADD COLUMN category_id    UUID REFERENCES public.drawer_transaction_categories(id),
  ADD COLUMN cash_out_type  TEXT CHECK (cash_out_type IN ('expense', 'payroll')),
  ADD COLUMN employee_name  TEXT,
  ADD COLUMN shift_start    TIMESTAMPTZ,
  ADD COLUMN shift_end      TIMESTAMPTZ,
  ADD COLUMN hours_worked   NUMERIC(5,2),
  ADD COLUMN hourly_rate    NUMERIC(10,2);

CREATE INDEX idx_drawer_transactions_category ON public.drawer_transactions(category_id);

COMMIT;
