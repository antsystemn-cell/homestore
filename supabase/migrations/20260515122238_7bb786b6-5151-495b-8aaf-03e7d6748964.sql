ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_position integer;
CREATE INDEX IF NOT EXISTS idx_products_brand_position ON public.products(brand_id, brand_position);