CREATE TABLE public.promo_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value numeric NOT NULL,
    min_order_amount numeric DEFAULT 0,
    expires_at timestamptz,
    usage_limit integer,
    used_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Grant access
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT SELECT ON public.promo_codes TO anon;
GRANT ALL ON public.promo_codes TO service_role;

-- RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active promo codes"
ON public.promo_codes
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
