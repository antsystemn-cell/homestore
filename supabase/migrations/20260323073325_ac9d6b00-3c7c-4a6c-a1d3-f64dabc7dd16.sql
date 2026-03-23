ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes jsonb DEFAULT '[]'::jsonb;