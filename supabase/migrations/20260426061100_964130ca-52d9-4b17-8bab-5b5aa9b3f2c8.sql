-- 1. Add delivery flow columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_proof_photo text,
  ADD COLUMN IF NOT EXISTS delivery_signature_name text,
  ADD COLUMN IF NOT EXISTS delivery_gps_lat numeric,
  ADD COLUMN IF NOT EXISTS delivery_gps_lng numeric;

CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 2. RLS policies for drivers on orders
DROP POLICY IF EXISTS "Drivers can view assigned and ready orders" ON public.orders;
CREATE POLICY "Drivers can view assigned and ready orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'driver'::app_role)
  AND (
    driver_id = auth.uid()
    OR (driver_id IS NULL AND status = 'ready')
    OR status IN ('out_for_delivery', 'delivered')
  )
);

DROP POLICY IF EXISTS "Drivers can update assigned orders" ON public.orders;
CREATE POLICY "Drivers can update assigned orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'driver'::app_role)
  AND (driver_id = auth.uid() OR (driver_id IS NULL AND status = 'ready'))
)
WITH CHECK (
  public.has_role(auth.uid(), 'driver'::app_role)
);

-- 3. Storage bucket for delivery proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — narrow SELECT to avoid public listing warning
DROP POLICY IF EXISTS "Delivery proofs are publicly viewable" ON storage.objects;
CREATE POLICY "Delivery proofs are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-proofs' AND (storage.foldername(name))[1] IS NOT NULL);

DROP POLICY IF EXISTS "Drivers can upload delivery proofs" ON storage.objects;
CREATE POLICY "Drivers can upload delivery proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND public.has_role(auth.uid(), 'driver'::app_role)
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Drivers can update own delivery proofs" ON storage.objects;
CREATE POLICY "Drivers can update own delivery proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND public.has_role(auth.uid(), 'driver'::app_role)
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Helper function to list drivers (for admin/moderator assignment UI)
CREATE OR REPLACE FUNCTION public.list_drivers()
RETURNS TABLE (user_id uuid, full_name text, phone text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.full_name, p.phone, u.email::text
  FROM public.user_roles r
  JOIN public.profiles p ON p.user_id = r.user_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  WHERE r.role = 'driver'::app_role
  ORDER BY p.full_name NULLS LAST;
END;
$$;