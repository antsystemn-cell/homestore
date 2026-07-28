
CREATE TABLE public.welcome_showcase_settings (
  id INT PRIMARY KEY DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL DEFAULT 'Тавтай морил! 👋',
  subtitle TEXT DEFAULT 'Онцлох болон хямдралтай бараануудаас сонгоно уу',
  image_size INT NOT NULL DEFAULT 130,
  columns INT NOT NULL DEFAULT 2,
  show_delay_ms INT NOT NULL DEFAULT 600,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.welcome_showcase_settings (id) VALUES (1);

GRANT SELECT ON public.welcome_showcase_settings TO anon, authenticated;
GRANT ALL ON public.welcome_showcase_settings TO service_role;
ALTER TABLE public.welcome_showcase_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read settings" ON public.welcome_showcase_settings FOR SELECT USING (true);
CREATE POLICY "admin manage settings" ON public.welcome_showcase_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.welcome_showcase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  link_url TEXT DEFAULT '/shop',
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.welcome_showcase_items TO anon, authenticated;
GRANT ALL ON public.welcome_showcase_items TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.welcome_showcase_items TO authenticated;
ALTER TABLE public.welcome_showcase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read items" ON public.welcome_showcase_items FOR SELECT USING (true);
CREATE POLICY "admin manage items" ON public.welcome_showcase_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_welcome_showcase_items_active_pos ON public.welcome_showcase_items (is_active, position);
