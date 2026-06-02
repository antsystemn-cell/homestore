
DROP POLICY IF EXISTS "Anon can view guest orders by id" ON public.orders;
DROP POLICY IF EXISTS "Anon can view payment intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Anyone can update own session by token" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Anyone can update lead scores" ON public.lead_scores;

DROP POLICY IF EXISTS "Anyone can create recovery rows" ON public.recovery_actions;
CREATE POLICY "Anyone can create recovery rows"
ON public.recovery_actions
FOR INSERT
WITH CHECK (
  handled_by IS NULL
  AND (status IS NULL OR status = 'pending')
);

CREATE OR REPLACE FUNCTION public.touch_analytics_session(_token text, _user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN RETURN; END IF;
  UPDATE public.analytics_sessions
  SET last_seen_at = now(),
      user_id = COALESCE(_user_id, user_id)
  WHERE session_token = _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_lead_score(_token text, _delta integer, _event text, _product_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN RETURN; END IF;
  UPDATE public.lead_scores ls
  SET score = ls.score + COALESCE(_delta, 0),
      last_activity = now(),
      last_event_type = _event,
      last_product_id = COALESCE(_product_id, ls.last_product_id),
      status = CASE
        WHEN ls.score + COALESCE(_delta, 0) >= 60 THEN 'hot'
        WHEN ls.score + COALESCE(_delta, 0) >= 25 THEN 'warm'
        ELSE 'cold'
      END
  WHERE ls.session_token = _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_lead_contact(_token text, _phone text DEFAULT NULL, _name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN RETURN; END IF;
  UPDATE public.lead_scores
  SET phone = COALESCE(_phone, phone),
      name  = COALESCE(_name, name)
  WHERE session_token = _token;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_analytics_session(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_lead_score(text, integer, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attach_lead_contact(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_analytics_session(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_lead_score(text, integer, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_lead_contact(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_guest_order(payload jsonb)
RETURNS TABLE(id uuid, order_ref text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_ref text;
BEGIN
  IF COALESCE(payload->>'phone','') = '' OR COALESCE(payload->>'shipping_address','') = '' THEN
    RAISE EXCEPTION 'phone and shipping_address are required';
  END IF;
  INSERT INTO public.orders(
    items, total, phone, shipping_address, status,
    delivery_option_id, delivery_fee, payment_method, payment_status,
    source_note, is_guest, guest_name, user_id
  ) VALUES (
    COALESCE(payload->'items','[]'::jsonb),
    COALESCE((payload->>'total')::numeric, 0),
    payload->>'phone',
    payload->>'shipping_address',
    COALESCE(payload->>'status','pending'),
    NULLIF(payload->>'delivery_option_id','')::uuid,
    COALESCE((payload->>'delivery_fee')::numeric, 0),
    COALESCE(payload->>'payment_method','cash'),
    COALESCE(payload->>'payment_status','unpaid'),
    NULLIF(payload->>'source_note',''),
    true,
    payload->>'guest_name',
    NULL
  )
  RETURNING orders.id, orders.order_ref INTO new_id, new_ref;
  id := new_id;
  order_ref := new_ref;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.create_guest_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(jsonb) TO anon, authenticated;

ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_send_order_to_delivery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_elle_sport_stock_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_driver_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_product_sales_on_complete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_elle_sport_stock_on_cancel() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_stock_movement() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Delivery proofs are publicly viewable" ON storage.objects;

CREATE POLICY "Admins view delivery proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'delivery-proofs' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

CREATE POLICY "Drivers view own delivery proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'delivery-proofs'
  AND public.has_role(auth.uid(), 'driver'::app_role)
  AND (storage.foldername(name))[1] = auth.uid()::text
);
