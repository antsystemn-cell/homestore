
-- Trigger: issue welcome coupon on new profile
CREATE OR REPLACE FUNCTION public.grant_welcome_coupon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  -- Skip if user already has any welcome coupon
  IF EXISTS (SELECT 1 FROM public.spin_coupons WHERE user_id = NEW.user_id AND code LIKE 'WELCOME-%') THEN
    RETURN NEW;
  END IF;
  v_code := 'WELCOME-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.spin_coupons(code, user_id, reward_type, reward_value, minimum_order_amount, expires_at)
  VALUES (v_code, NEW.user_id, 'fixed_amount', 15000, 100000, now() + interval '48 hours');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_welcome_coupon ON public.profiles;
CREATE TRIGGER trg_grant_welcome_coupon
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_welcome_coupon();

-- Backfill for existing users without a welcome coupon and joined < 48h ago
INSERT INTO public.spin_coupons(code, user_id, reward_type, reward_value, minimum_order_amount, expires_at)
SELECT 'WELCOME-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
       p.user_id, 'fixed_amount', 15000, 100000,
       p.created_at + interval '48 hours'
FROM public.profiles p
WHERE p.created_at > now() - interval '48 hours'
  AND NOT EXISTS (SELECT 1 FROM public.spin_coupons c WHERE c.user_id = p.user_id AND c.code LIKE 'WELCOME-%');

-- RPC: fetch the current user's active welcome coupon (for popup + banner)
CREATE OR REPLACE FUNCTION public.get_my_welcome_coupon()
RETURNS TABLE(code text, reward_value numeric, minimum_order_amount numeric, expires_at timestamptz, is_used boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.reward_value, c.minimum_order_amount, c.expires_at, c.is_used
  FROM public.spin_coupons c
  WHERE c.user_id = auth.uid()
    AND c.code LIKE 'WELCOME-%'
    AND c.invalidated_at IS NULL
  ORDER BY c.created_at DESC
  LIMIT 1
$$;
