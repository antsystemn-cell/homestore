
-- Auto-dispatch orders to the delivery system via send-to-delivery edge function
-- Uses pg_net to call the function asynchronously when:
--   * admin manual order (source <> 'web') transitions to status='confirmed'
--   * web order's payment_status transitions to 'paid'
-- The edge function itself checks delivery_order_id and skips duplicates.

CREATE OR REPLACE FUNCTION public.auto_send_order_to_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  should_send boolean := false;
  func_url text;
  service_key text;
BEGIN
  -- Skip if already sent
  IF NEW.delivery_order_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.source, 'web') <> 'web' THEN
    -- Admin/manual orders: send when confirmed
    IF NEW.status = 'confirmed'
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
      should_send := true;
    END IF;
  ELSE
    -- Web (customer) orders: send when payment becomes paid
    IF NEW.payment_status = 'paid'
       AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
      should_send := true;
    END IF;
  END IF;

  IF NOT should_send THEN
    RETURN NEW;
  END IF;

  func_url := 'https://jiqjebbxcwetakdhfuel.supabase.co/functions/v1/send-to-delivery';
  service_key := current_setting('app.settings.service_role_key', true);

  BEGIN
    PERFORM net.http_post(
      url := func_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object('order_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never block the order write because of a delivery dispatch error
    RAISE WARNING 'auto_send_order_to_delivery failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_send_order_to_delivery ON public.orders;
CREATE TRIGGER trg_auto_send_order_to_delivery
AFTER INSERT OR UPDATE OF status, payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_send_order_to_delivery();
