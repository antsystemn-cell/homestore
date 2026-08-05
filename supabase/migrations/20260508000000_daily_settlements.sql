CREATE TABLE IF NOT EXISTS public.daily_settlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_date date NOT NULL UNIQUE,
    total_sales numeric(15, 2) NOT NULL DEFAULT 0,
    order_count integer NOT NULL DEFAULT 0,
    closed_at timestamptz DEFAULT now(),
    closed_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_settlements TO authenticated;
GRANT ALL ON public.daily_settlements TO service_role;

ALTER TABLE public.daily_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settlements"
ON public.daily_settlements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
