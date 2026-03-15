-- Owner distributions: record funds distributed to owners (payment method, amount, optional description).

CREATE TABLE public.owner_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES public.payments_methods(id),
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  distribution_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_owner_distributions_owner_id ON public.owner_distributions(owner_id);
CREATE INDEX idx_owner_distributions_distribution_date ON public.owner_distributions(distribution_date);
CREATE INDEX idx_owner_distributions_payment_method_id ON public.owner_distributions(payment_method_id);

ALTER TABLE public.owner_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_anon_direct_access"
  ON public.owner_distributions FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
