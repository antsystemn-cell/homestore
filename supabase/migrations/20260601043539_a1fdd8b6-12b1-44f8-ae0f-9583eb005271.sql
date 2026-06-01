-- Add delivery return reason and payment collection tracking for driver flow
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_return_reason text,
  ADD COLUMN IF NOT EXISTS payment_collected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS delivery_failed_at timestamp with time zone;