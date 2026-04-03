
CREATE OR REPLACE FUNCTION public.increment_product_sales_on_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item RECORD;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) AS elem
    LOOP
      UPDATE public.products
      SET sales = COALESCE(sales, 0) + COALESCE((item.elem->>'quantity')::int, 1)
      WHERE id = (item.elem->>'product_id')::uuid;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
