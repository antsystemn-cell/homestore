-- Create body_profiles table
CREATE TABLE public.body_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    bust_cm NUMERIC,
    waist_cm NUMERIC,
    hip_cm NUMERIC,
    body_shape TEXT CHECK (body_shape IN ('Slim', 'Regular', 'Curvy', 'Athletic')),
    preferred_fit TEXT CHECK (preferred_fit IN ('Tight', 'Regular', 'Loose')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_profiles TO authenticated;
GRANT ALL ON public.body_profiles TO service_role;

ALTER TABLE public.body_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own body profile"
    ON public.body_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body profile"
    ON public.body_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body profile"
    ON public.body_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add size chart and fit info columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_chart JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stretch_level TEXT CHECK (stretch_level IN ('Low', 'Medium', 'High')) DEFAULT 'Medium';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fit_type TEXT CHECK (fit_type IN ('Slim Fit', 'Regular Fit', 'Oversized')) DEFAULT 'Regular Fit';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fabric_material TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shrinkage_percent NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compression_level TEXT;

-- Create product_fit_feedback table for AI training
CREATE TABLE public.product_fit_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    purchased_size TEXT NOT NULL,
    fit_feedback TEXT CHECK (fit_feedback IN ('Too Small', 'Perfect', 'Too Large')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT ON public.product_fit_feedback TO authenticated;
GRANT ALL ON public.product_fit_feedback TO service_role;

ALTER TABLE public.product_fit_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fit feedback"
    ON public.product_fit_feedback FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fit feedback"
    ON public.product_fit_feedback FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
