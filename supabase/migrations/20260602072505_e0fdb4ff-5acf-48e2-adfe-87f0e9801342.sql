
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
  IF NEW.delivery_order_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Send when status becomes 'confirmed' (admin-manual or admin-confirmed cash orders)
  IF NEW.status = 'confirmed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    should_send := true;
  END IF;

  -- Send when payment becomes 'paid' (online-paid customer orders)
  IF NEW.payment_status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    should_send := true;
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
    RAISE WARNING 'auto_send_order_to_delivery failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
