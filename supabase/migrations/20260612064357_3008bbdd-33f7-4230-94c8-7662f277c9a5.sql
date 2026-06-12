
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active branches"
  ON public.branches FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage branches"
  ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.current_user_branch()
RETURNS TABLE(id uuid, name text, code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.name, b.code
  FROM public.profiles p
  JOIN public.branches b ON b.id = p.branch_id
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_branch() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_branch() TO authenticated;

CREATE POLICY "Delivery entry can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'delivery_entry'));

CREATE POLICY "Delivery entry can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'delivery_entry'))
  WITH CHECK (public.has_role(auth.uid(), 'delivery_entry'));

CREATE OR REPLACE FUNCTION public.delivery_entry_submit(
  _order_id uuid,
  _phone text,
  _shipping_address text,
  _note text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_branch_name text;
  v_order public.orders;
BEGIN
  IF NOT (public.has_role(auth.uid(),'delivery_entry')
       OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT b.name INTO v_branch_name
  FROM public.profiles p
  JOIN public.branches b ON b.id = p.branch_id
  WHERE p.user_id = auth.uid();

  IF v_branch_name IS NULL THEN
    RAISE EXCEPTION 'No branch assigned to user';
  END IF;

  UPDATE public.orders
  SET phone = COALESCE(NULLIF(_phone,''), phone),
      shipping_address = COALESCE(NULLIF(_shipping_address,''), shipping_address),
      branch = v_branch_name,
      source_note = COALESCE(NULLIF(_note,''), source_note),
      updated_at = now()
  WHERE id = _order_id
  RETURNING * INTO v_order;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  RETURN v_order;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.delivery_entry_submit(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delivery_entry_submit(uuid, text, text, text) TO authenticated;
