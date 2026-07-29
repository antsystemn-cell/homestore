
CREATE TABLE IF NOT EXISTS public.deleted_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_ref text,
  snapshot jsonb NOT NULL,
  deleted_by uuid,
  deleted_by_email text,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deleted_orders TO authenticated;
GRANT ALL ON public.deleted_orders TO service_role;

ALTER TABLE public.deleted_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deleted orders"
ON public.deleted_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete archive"
ON public.deleted_orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_deleted_orders_deleted_at ON public.deleted_orders (deleted_at DESC);

-- Trigger to snapshot order on delete
CREATE OR REPLACE FUNCTION public.archive_deleted_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  BEGIN
    SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    _email := NULL;
  END;

  INSERT INTO public.deleted_orders (order_id, order_ref, snapshot, deleted_by, deleted_by_email)
  VALUES (OLD.id, OLD.order_ref, to_jsonb(OLD), auth.uid(), _email);

  -- Keep only last 50 archive rows to bound size
  DELETE FROM public.deleted_orders
  WHERE id IN (
    SELECT id FROM public.deleted_orders ORDER BY deleted_at DESC OFFSET 50
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_deleted_order ON public.orders;
CREATE TRIGGER trg_archive_deleted_order
BEFORE DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_order();

-- List recent deleted orders (admins only)
CREATE OR REPLACE FUNCTION public.admin_list_deleted_orders(_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  order_id uuid,
  order_ref text,
  snapshot jsonb,
  deleted_by uuid,
  deleted_by_email text,
  deleted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT d.id, d.order_id, d.order_ref, d.snapshot, d.deleted_by, d.deleted_by_email, d.deleted_at
  FROM public.deleted_orders d
  ORDER BY d.deleted_at DESC
  LIMIT COALESCE(_limit, 5);
END;
$$;

-- Restore a deleted order
CREATE OR REPLACE FUNCTION public.admin_restore_deleted_order(_archive_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _snap jsonb;
  _order_id uuid;
  _exists boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT snapshot, order_id INTO _snap, _order_id
  FROM public.deleted_orders
  WHERE id = _archive_id;

  IF _snap IS NULL THEN
    RAISE EXCEPTION 'archive not found';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.orders WHERE id = _order_id) INTO _exists;
  IF _exists THEN
    -- Already restored/exists; just remove archive row
    DELETE FROM public.deleted_orders WHERE id = _archive_id;
    RETURN _order_id;
  END IF;

  INSERT INTO public.orders
  SELECT * FROM jsonb_populate_record(NULL::public.orders, _snap);

  DELETE FROM public.deleted_orders WHERE id = _archive_id;

  RETURN _order_id;
END;
$$;
