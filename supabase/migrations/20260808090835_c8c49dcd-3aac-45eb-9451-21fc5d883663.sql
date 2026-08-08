CREATE TABLE public.site_branding (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_title text DEFAULT 'EasyShop',
    site_description text,
    favicon_url text,
    og_image_url text,
    logo_url text,
    updated_at timestamptz DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_branding TO authenticated;
GRANT ALL ON public.site_branding TO service_role;
GRANT SELECT ON public.site_branding TO anon;

ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to branding" ON public.site_branding
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage branding" ON public.site_branding
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Insert initial row if not exists
INSERT INTO public.site_branding (id, site_title, site_description)
VALUES ('00000000-0000-0000-0000-000000000000', 'EasyShop', 'Амьдралын Style')
ON CONFLICT (id) DO NOTHING;
