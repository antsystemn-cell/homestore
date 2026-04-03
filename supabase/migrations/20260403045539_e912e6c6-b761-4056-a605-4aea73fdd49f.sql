
-- Allow guest orders: make user_id nullable and add guest fields
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN is_guest boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN guest_name text;
ALTER TABLE public.orders ADD COLUMN order_ref text;

-- Generate order reference for all orders
CREATE OR REPLACE FUNCTION public.generate_order_ref()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.order_ref := 'ES-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_ref
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_ref();

-- Allow anonymous users to insert guest orders
CREATE POLICY "Anon can create guest orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL AND is_guest = true);

-- Allow anon to read their own guest order by id (for confirmation page)
CREATE POLICY "Anon can view guest orders by id"
ON public.orders
FOR SELECT
TO anon
USING (is_guest = true);
