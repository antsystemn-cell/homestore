ALTER TABLE public.story_videos
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_story_videos_product_id ON public.story_videos(product_id);