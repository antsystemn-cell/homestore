
-- 1. Official garment measurements per product
CREATE TABLE public.product_size_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  measurement_type text NOT NULL,
  measurement_value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'cm',
  source text NOT NULL DEFAULT 'ELLE official',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, size, measurement_type)
);
GRANT SELECT ON public.product_size_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_size_guides TO authenticated;
GRANT ALL ON public.product_size_guides TO service_role;
ALTER TABLE public.product_size_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Size guides are publicly readable"
  ON public.product_size_guides FOR SELECT USING (true);
CREATE POLICY "Admins manage size guides"
  ON public.product_size_guides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_product_size_guides_updated_at
  BEFORE UPDATE ON public.product_size_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Per-product recommendation configuration
CREATE TABLE public.size_recommendation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'top',
  fit_type text NOT NULL DEFAULT 'Regular Fit',
  stretch_level text NOT NULL DEFAULT 'Medium',
  material text,
  algorithm_version text NOT NULL DEFAULT 'v1',
  height_weight_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  chart_image_url text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.size_recommendation_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.size_recommendation_config TO authenticated;
GRANT ALL ON public.size_recommendation_config TO service_role;
ALTER TABLE public.size_recommendation_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Size config is publicly readable"
  ON public.size_recommendation_config FOR SELECT USING (true);
CREATE POLICY "Admins manage size config"
  ON public.size_recommendation_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_size_recommendation_config_updated_at
  BEFORE UPDATE ON public.size_recommendation_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Saved user size profile
CREATE TABLE public.user_size_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  height_cm numeric,
  weight_kg numeric,
  preferred_fit text NOT NULL DEFAULT 'regular',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_size_profiles TO authenticated;
GRANT ALL ON public.user_size_profiles TO service_role;
ALTER TABLE public.user_size_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own size profile"
  ON public.user_size_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_size_profiles_updated_at
  BEFORE UPDATE ON public.user_size_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Analytics events (future ML dataset)
CREATE TABLE public.size_finder_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  user_id uuid,
  session_token text,
  event_type text NOT NULL,
  recommended_size text,
  selected_size text,
  height_cm numeric,
  weight_kg numeric,
  fit_preference text,
  confidence text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_size_finder_events_product ON public.size_finder_events(product_id, created_at DESC);
GRANT INSERT ON public.size_finder_events TO anon;
GRANT INSERT, SELECT ON public.size_finder_events TO authenticated;
GRANT ALL ON public.size_finder_events TO service_role;
ALTER TABLE public.size_finder_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log size finder events"
  ON public.size_finder_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read size finder events"
  ON public.size_finder_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
