ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_code text,
ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '[]'::jsonb;