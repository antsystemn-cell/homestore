
CREATE TABLE IF NOT EXISTS public.stock_deduction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  order_ref text,
  product_id uuid,
  product_name text,
  color text,
  size text,
  variant_key text,
  quantity_deducted int NOT NULL,
  stock_before int,
  stock_after int,
  brand_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_deduction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view stock deduction log"
ON public.stock_deduction_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators view stock deduction log"
ON public.stock_deduction_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE INDEX IF NOT EXISTS idx_stock_deduction_log_order ON public.stock_deduction_log(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_deduction_log_product ON public.stock_deduction_log(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_deduction_log_created ON public.stock_deduction_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.deduct_elle_sport_stock_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ELLE_BRAND_ID constant uuid := '24c51924-70f8-453c-b6cd-7e6eccbda36e';
  CUTOFF constant timestamptz := '2026-05-05 11:00:00+08';
  item jsonb;
  v_product_id uuid;
  v_product_name text;
  v_qty int;
  v_color text;
  v_size text;
  v_key text;
  v_brand_id uuid;
  v_variant jsonb;
  v_current int;
  v_new int;
BEGIN
  IF NEW.created_at < CUTOFF THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
  LOOP
    BEGIN
      v_product_id := NULLIF(item->>'product_id','')::uuid;
    EXCEPTION WHEN others THEN
      v_product_id := NULL;
    END;
    IF v_product_id IS NULL THEN CONTINUE; END IF;

    v_qty := COALESCE((item->>'quantity')::int, 1);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    SELECT brand_id, variant_stock, name INTO v_brand_id, v_variant, v_product_name
    FROM public.products WHERE id = v_product_id;

    IF v_brand_id IS DISTINCT FROM ELLE_BRAND_ID THEN CONTINUE; END IF;

    v_color := COALESCE(item->>'color','');
    v_size := COALESCE(item->>'size','');
    v_key := v_color || '|' || v_size;

    v_current := COALESCE((v_variant->>v_key)::int, 0);
    v_new := GREATEST(0, v_current - v_qty);

    UPDATE public.products
    SET variant_stock = COALESCE(variant_stock,'{}'::jsonb) || jsonb_build_object(v_key, v_new),
        stock_quantity = GREATEST(0, COALESCE(stock_quantity,0) - v_qty),
        updated_at = now()
    WHERE id = v_product_id;

    INSERT INTO public.stock_deduction_log
      (order_id, order_ref, product_id, product_name, color, size, variant_key,
       quantity_deducted, stock_before, stock_after, brand_id, created_at)
    VALUES
      (NEW.id, NEW.order_ref, v_product_id, v_product_name, v_color, v_size, v_key,
       v_qty, v_current, v_new, v_brand_id, now());
  END LOOP;

  RETURN NEW;
END;
$function$;
