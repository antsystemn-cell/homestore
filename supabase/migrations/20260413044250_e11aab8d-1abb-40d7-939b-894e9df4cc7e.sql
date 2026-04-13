
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_order_id text,
ADD COLUMN IF NOT EXISTS delivery_status text;
