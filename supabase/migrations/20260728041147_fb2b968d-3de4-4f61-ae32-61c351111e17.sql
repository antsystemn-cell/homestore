
CREATE OR REPLACE FUNCTION public.grant_welcome_coupon()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.spin_coupons WHERE user_id = NEW.user_id AND code LIKE 'WELCOME-%') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE invited_user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  v_code := 'WELCOME-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.spin_coupons(code, user_id, reward_type, reward_value, minimum_order_amount, expires_at)
  VALUES (v_code, NEW.user_id, 'fixed_amount', 10000, 100000, now() + interval '14 days');
  RETURN NEW;
END;
$function$;

UPDATE public.spin_coupons
SET reward_value = 10000,
    expires_at = GREATEST(expires_at, created_at + interval '14 days')
WHERE code LIKE 'WELCOME-%'
  AND is_used = false
  AND invalidated_at IS NULL;

UPDATE public.wallet_credits wc
SET value = 10000,
    expires_at = sc.expires_at
FROM public.spin_coupons sc
WHERE wc.source_coupon_id = sc.id
  AND wc.credit_type = 'welcome'
  AND wc.status = 'active'
  AND sc.code LIKE 'WELCOME-%';
