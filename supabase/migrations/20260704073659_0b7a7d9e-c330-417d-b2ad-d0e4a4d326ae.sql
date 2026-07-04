
DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, phone text, address text, avatar_url text,
  email text, created_at timestamptz,
  loyalty_points integer, order_count integer, is_vip boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT p.id, p.user_id, p.full_name, p.phone, p.address, p.avatar_url,
         u.email::text AS email, p.created_at,
         COALESCE(p.loyalty_points,0) AS loyalty_points,
         COALESCE(oc.cnt,0)::int AS order_count,
         (COALESCE(oc.cnt,0) >= 3) AS is_vip
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.user_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS cnt
        FROM public.orders o
       WHERE o.user_id = p.user_id
         AND o.status IN ('completed','delivered','confirmed','delivering','paid')
    ) oc ON true
   ORDER BY p.created_at DESC;
END;
$$;
