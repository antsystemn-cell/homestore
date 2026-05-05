
CREATE OR REPLACE FUNCTION public.admin_list_orders_light()
RETURNS SETOF public.orders
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
  SELECT
    o.delivery_order_id, o.delivery_status, o.driver_id, o.assigned_at,
    o.picked_up_at, o.delivered_at, o.delivery_proof_photo,
    o.delivery_signature_name, o.delivery_gps_lat, o.delivery_gps_lng,
    o.source, o.source_note, o.sale_date, o.external_ref, o.branch, o.phone,
    o.user_id,
    COALESCE(
      (SELECT jsonb_agg(elem - 'image')
         FROM jsonb_array_elements(o.items) elem),
      '[]'::jsonb
    ) AS items,
    o.total, o.status, o.shipping_address, o.id, o.created_at, o.updated_at,
    o.delivery_option_id, o.delivery_fee, o.delivery_pickup_photo,
    o.delivery_completed_photo, o.payment_method, o.payment_status,
    o.payment_intent_id, o.is_guest, o.guest_name, o.order_ref
  FROM public.orders o
  ORDER BY o.created_at DESC;
END;
$$;
