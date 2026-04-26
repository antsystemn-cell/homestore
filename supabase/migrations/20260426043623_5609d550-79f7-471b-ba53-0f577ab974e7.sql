-- 1. Add stock_quantity to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

-- 2. Stock movements log table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  reason text NOT NULL DEFAULT 'manual',
  order_id uuid,
  note text,
  performed_by uuid,
  performed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order ON public.stock_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock movements"
ON public.stock_movements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can view stock movements"
ON public.stock_movements FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can insert stock movements"
ON public.stock_movements FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'moderator'::app_role) AND auth.uid() = performed_by);

-- 3. Allow moderators to update product stock_quantity
-- Existing "Admins can manage products" already covers admins.
CREATE POLICY "Moderators can update product stock"
ON public.products FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'moderator'::app_role));

-- 4. Trigger: when a stock_movement is inserted, decrement product stock
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - NEW.quantity),
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_apply_stock_movement
AFTER INSERT ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.apply_stock_movement();