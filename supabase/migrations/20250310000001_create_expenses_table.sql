-- Expenses table for "add expense" flow (Money tab). Stores non-cash and optional cash
-- expenses entered manually; dashboard aggregates these with drawer cash-outs for the Expenses tab.

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12, 2) NOT NULL,
  expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  category_id UUID REFERENCES public.drawer_transaction_categories(id),
  payment_method_id UUID NOT NULL REFERENCES public.payments_methods(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX idx_expenses_payment_method_id ON public.expenses(payment_method_id);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_anon_direct_access"
  ON public.expenses FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
