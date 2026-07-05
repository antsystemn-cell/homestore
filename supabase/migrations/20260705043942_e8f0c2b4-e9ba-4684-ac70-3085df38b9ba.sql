
CREATE TABLE public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_embed_url text NOT NULL,
  facebook_page_url text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reels TO authenticated;
GRANT ALL ON public.reels TO service_role;

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reels are publicly viewable when active"
  ON public.reels FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage reels"
  ON public.reels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_reels_updated_at
  BEFORE UPDATE ON public.reels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
