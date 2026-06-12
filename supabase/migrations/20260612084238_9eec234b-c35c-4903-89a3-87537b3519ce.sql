CREATE OR REPLACE FUNCTION public.increment_product_sales_on_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  v_pid uuid;
  v_qty int;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      BEGIN
        v_pid := NULLIF(item->>'product_id','')::uuid;
      EXCEPTION WHEN others THEN
        v_pid := NULL;
      END;
      IF v_pid IS NULL THEN CONTINUE; END IF;
      v_qty := COALESCE((item->>'quantity')::int, 1);
      UPDATE public.products
      SET sales = COALESCE(sales, 0) + v_qty
      WHERE id = v_pid;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;