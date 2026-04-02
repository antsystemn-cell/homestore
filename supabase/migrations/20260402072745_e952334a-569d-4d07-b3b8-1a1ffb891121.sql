
-- Add slug column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create a function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        trim(name),
        '\s+', '-', 'g'
      ),
      '[^a-zA-Z0-9\u0400-\u04FF\u1800-\u18AF-]', '', 'g'
    )
  );
END;
$$;

-- Populate slug for existing products
UPDATE public.products SET slug = public.generate_slug(name) WHERE slug IS NULL;

-- Handle duplicates by appending a suffix
DO $$
DECLARE
  r RECORD;
  counter INT;
BEGIN
  FOR r IN 
    SELECT slug, array_agg(id ORDER BY created_at) as ids
    FROM public.products
    GROUP BY slug
    HAVING count(*) > 1
  LOOP
    counter := 1;
    FOR i IN 2..array_length(r.ids, 1) LOOP
      UPDATE public.products SET slug = r.slug || '-' || counter WHERE id = r.ids[i];
      counter := counter + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- Make slug NOT NULL and unique
ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON public.products (slug);

-- Create trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION public.set_product_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_slug(NEW.name);
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_product_slug_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_product_slug();
