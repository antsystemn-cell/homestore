CREATE TABLE public.product_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref TEXT,
  order_id UUID,
  phone TEXT NOT NULL,
  customer_name TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  refund_amount INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'unused',
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_returns_created ON public.product_returns(created_at DESC);
CREATE INDEX idx_product_returns_status ON public.product_returns(status);
CREATE INDEX idx_product_returns_phone ON public.product_returns(phone);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_returns TO authenticated;
GRANT ALL ON public.product_returns TO service_role;

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage returns"
ON public.product_returns FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER update_product_returns_updated_at
BEFORE UPDATE ON public.product_returns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();