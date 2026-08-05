-- Add parent_id and slug to categories table
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

-- Create an index for parent_id and slug
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories(parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_idx ON public.categories(slug);

-- Grant permissions (standard procedure)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;
GRANT ALL ON public.categories TO service_role;

-- Update existing categories with slugs if they don't have one
UPDATE public.categories SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) WHERE slug IS NULL;
