ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS sale_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS branch text;

CREATE INDEX IF NOT EXISTS idx_orders_external_ref ON public.orders(external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_branch ON public.orders(branch) WHERE branch IS NOT NULL;