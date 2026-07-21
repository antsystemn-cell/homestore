
CREATE OR REPLACE FUNCTION public.admin_list_used_coupons(_limit int DEFAULT 500)
RETURNS TABLE(
  id uuid, code text, user_id uuid, user_email text, user_name text,
  reward_type text, reward_value numeric, minimum_order_amount numeric,
  used_at timestamptz, created_at timestamptz, expires_at timestamptz,
  used_order_id uuid, order_ref text, order_total numeric, source text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT c.id, c.code, c.user_id, u.email::text, p.full_name,
         c.reward_type, c.reward_value, c.minimum_order_amount,
         c.used_at, c.created_at, c.expires_at,
         c.used_order_id, o.order_ref, o.total,
         CASE
           WHEN c.code LIKE 'WELCOME-%' THEN 'welcome'
           WHEN c.code LIKE 'REF-%' THEN 'referral_inviter'
           WHEN c.code LIKE 'INV-%' THEN 'referral_invitee'
           WHEN c.code LIKE 'SPIN-%' OR c.code LIKE 'WHEEL-%' THEN 'wheel'
           ELSE 'other'
         END AS source
  FROM public.spin_coupons c
  LEFT JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  LEFT JOIN public.orders o ON o.id = c.used_order_id
  WHERE c.is_used = true
  ORDER BY c.used_at DESC NULLS LAST
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_spin_winners(_limit int DEFAULT 500)
RETURNS TABLE(
  id uuid, user_id uuid, user_email text, user_name text,
  reward_type text, reward_value numeric,
  coupon_id uuid, coupon_code text, coupon_used boolean,
  gift_product_id uuid, gift_product_name text,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT h.id, h.user_id, u.email::text, p.full_name,
         h.reward_type, h.reward_value,
         h.coupon_id, c.code, c.is_used,
         h.gift_product_id, pr.name,
         h.created_at
  FROM public.spin_history h
  LEFT JOIN auth.users u ON u.id = h.user_id
  LEFT JOIN public.profiles p ON p.user_id = h.user_id
  LEFT JOIN public.spin_coupons c ON c.id = h.coupon_id
  LEFT JOIN public.products pr ON pr.id = h.gift_product_id
  ORDER BY h.created_at DESC
  LIMIT _limit;
END;
$$;
