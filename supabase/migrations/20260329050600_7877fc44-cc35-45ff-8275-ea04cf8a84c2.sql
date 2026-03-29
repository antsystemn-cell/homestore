
CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text DEFAULT '',
  button_text text DEFAULT 'Бүтээгдхүүн үзэх',
  button_link text DEFAULT '/shop',
  is_active boolean NOT NULL DEFAULT true,
  position integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo banners" ON public.promo_banners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Promo banners viewable by everyone" ON public.promo_banners
  FOR SELECT TO public
  USING (true);

INSERT INTO public.promo_banners (title, subtitle, button_text, button_link, is_active, position)
VALUES ('1КГ тутамд -1$', 'Тээврийн зардал хямдарлаа!', 'Бүтээгдхүүн үзэх', '/shop', true, 0);
