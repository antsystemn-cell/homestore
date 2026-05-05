
CREATE OR REPLACE FUNCTION public.deduct_elle_sport_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ELLE_BRAND_ID constant uuid := '24c51924-70f8-453c-b6cd-7e6eccbda36e';
  CUTOFF constant timestamptz := '2026-05-05 11:00:00+08';
  item jsonb;
  v_product_id uuid;
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

    SELECT brand_id, variant_stock INTO v_brand_id, v_variant
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
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deduct_elle_sport_stock ON public.orders;
CREATE TRIGGER trg_deduct_elle_sport_stock
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_elle_sport_stock_on_order();
