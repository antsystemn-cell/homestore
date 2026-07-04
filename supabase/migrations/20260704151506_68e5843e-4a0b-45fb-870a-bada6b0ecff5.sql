
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sale_price numeric NOT NULL CHECK (sale_price >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flash_sales_product_active_idx ON public.flash_sales(product_id, is_active, ends_at);
CREATE INDEX IF NOT EXISTS flash_sales_window_idx ON public.flash_sales(is_active, starts_at, ends_at);

GRANT SELECT ON public.flash_sales TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.flash_sales TO authenticated;
GRANT ALL ON public.flash_sales TO service_role;

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view flash sales"
  ON public.flash_sales FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage flash sales"
  ON public.flash_sales FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_flash_sales_updated_at
  BEFORE UPDATE ON public.flash_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_active_flash_sales()
RETURNS TABLE(
  id uuid,
  product_id uuid,
  sale_price numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  product_name text,
  product_slug text,
  product_price numeric,
  product_image text,
  product_thumbnail text,
  discount_percent int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.product_id, f.sale_price, f.starts_at, f.ends_at,
         p.name, p.slug, p.price, p.image_url, p.thumbnail_url,
         CASE WHEN p.price > 0
              THEN GREATEST(0, ROUND(((p.price - f.sale_price) / p.price) * 100))::int
              ELSE 0 END
  FROM public.flash_sales f
  JOIN public.products p ON p.id = f.product_id
  WHERE f.is_active = true
    AND f.starts_at <= now()
    AND f.ends_at > now()
    AND COALESCE(p.is_active, true) = true
  ORDER BY f.ends_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_flash_sales() TO anon, authenticated;
