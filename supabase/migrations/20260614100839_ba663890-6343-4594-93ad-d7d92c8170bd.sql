
CREATE TABLE public.seller_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_sales TO authenticated;
GRANT ALL ON public.seller_sales TO service_role;

ALTER TABLE public.seller_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own sales" ON public.seller_sales
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Sellers insert own sales" ON public.seller_sales
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(),'seller') OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "Sellers update own sales" ON public.seller_sales
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete sales" ON public.seller_sales
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_seller_sales_updated_at
  BEFORE UPDATE ON public.seller_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reassign role for odnoo20101207@gmail.com
DELETE FROM public.user_roles
WHERE user_id = '527e490f-8119-4c63-9a5a-a7884cb3944d'
  AND role IN ('admin','moderator');

INSERT INTO public.user_roles (user_id, role)
VALUES ('527e490f-8119-4c63-9a5a-a7884cb3944d', 'seller')
ON CONFLICT (user_id, role) DO NOTHING;
