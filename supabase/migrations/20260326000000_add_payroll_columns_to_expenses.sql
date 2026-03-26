-- Add optional payroll metadata columns to expenses table.
-- Allows recording payroll entries from Dashboard Expenses tab alongside regular expenses.

ALTER TABLE public.expenses
  ADD COLUMN employee_name TEXT,
  ADD COLUMN hours_worked NUMERIC(6,2),
  ADD COLUMN hourly_rate NUMERIC(10,2),
  ADD COLUMN payroll_schedule TEXT CHECK (payroll_schedule IN ('daily', 'weekly'));
