
CREATE TABLE public.ad_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT,
  placement TEXT NOT NULL DEFAULT 'top',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ads viewable by everyone"
  ON public.ad_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage ads"
  ON public.ad_images FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ad_images_updated_at
  BEFORE UPDATE ON public.ad_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
