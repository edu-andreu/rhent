-- Migration: Allow cash_out_type 'move_money' for drawer transactions.

ALTER TABLE public.drawer_transactions
  DROP CONSTRAINT IF EXISTS drawer_transactions_cash_out_type_check;

ALTER TABLE public.drawer_transactions
  ADD CONSTRAINT drawer_transactions_cash_out_type_check
  CHECK (cash_out_type IS NULL OR cash_out_type IN ('expense', 'payroll', 'move_money'));
