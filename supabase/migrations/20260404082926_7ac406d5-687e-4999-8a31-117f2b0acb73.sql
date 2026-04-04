CREATE OR REPLACE FUNCTION public.increment_product_sales_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.items)
    LOOP
      UPDATE public.products
      SET sales = COALESCE(sales, 0) + COALESCE((item->>'quantity')::int, 1)
      WHERE id = (item->>'product_id')::uuid;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS increment_product_sales_on_complete_trigger ON public.orders;

CREATE TRIGGER increment_product_sales_on_complete_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.increment_product_sales_on_complete();