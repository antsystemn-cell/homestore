CREATE TABLE public.recommendation_settings (
  id integer PRIMARY KEY DEFAULT 1,
  related_weights jsonb NOT NULL DEFAULT '{"category":40,"brand":35,"tokenOverlap":12,"maxTokenOverlapTokens":4,"priceProximity":25,"popularity":10,"saleBoost":5}'::jsonb,
  cart_weights jsonb NOT NULL DEFAULT '{"category":40,"brand":35,"tokenOverlap":12,"maxTokenOverlapTokens":4,"priceProximity":25,"popularity":10,"saleBoost":5}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.recommendation_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.recommendation_settings TO authenticated;
GRANT ALL ON public.recommendation_settings TO service_role;

ALTER TABLE public.recommendation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recommendation settings viewable by everyone"
ON public.recommendation_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert recommendation settings"
ON public.recommendation_settings FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update recommendation settings"
ON public.recommendation_settings FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.recommendation_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;