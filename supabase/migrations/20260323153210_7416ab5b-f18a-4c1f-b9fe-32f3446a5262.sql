
-- Add fields to delivery_options
ALTER TABLE public.delivery_options
ADD COLUMN address TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN payment_terms TEXT;

-- Add delivery photo fields to orders
ALTER TABLE public.orders
ADD COLUMN delivery_pickup_photo TEXT,
ADD COLUMN delivery_completed_photo TEXT;
