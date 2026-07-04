
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_inviter uuid;
  v_existing uuid;
  v_coupon_id uuid;
  v_coupon_code text;
  v_my_phone text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF _code IS NULL OR length(trim(_code)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT user_id INTO v_inviter FROM public.profiles
  WHERE upper(referral_code) = upper(trim(_code))
  LIMIT 1;

  IF v_inviter IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_not_found');
  END IF;
  IF v_inviter = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  SELECT id INTO v_existing FROM public.referrals WHERE invited_user_id = v_uid LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;

  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'existing_customer');
  END IF;

  -- Phone duplicate check: reject if my phone is already used by ANOTHER profile
  SELECT phone INTO v_my_phone FROM public.profiles WHERE user_id = v_uid;
  IF v_my_phone IS NOT NULL AND length(trim(v_my_phone)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE phone = v_my_phone AND user_id <> v_uid
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'duplicate_phone');
    END IF;
  END IF;

  -- Issue 10% coupon to invitee (mirrored to wallet_credits)
  v_coupon_code := 'INV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.spin_coupons(code, user_id, reward_type, reward_value, minimum_order_amount, expires_at)
  VALUES (v_coupon_code, v_uid, 'percent', 10, 0, now() + interval '30 days')
  RETURNING id INTO v_coupon_id;

  INSERT INTO public.referrals(inviter_user_id, invited_user_id, status, invitee_coupon_id)
  VALUES (v_inviter, v_uid, 'pending', v_coupon_id);

  -- Cancel any unused welcome bonus (single acquisition reward per user)
  UPDATE public.spin_coupons
    SET invalidated_at = now()
    WHERE user_id = v_uid
      AND code LIKE 'WELCOME-%'
      AND is_used = false
      AND invalidated_at IS NULL;

  UPDATE public.wallet_credits
    SET status = 'expired'
    WHERE user_id = v_uid
      AND credit_type = 'welcome'
      AND status = 'active';

  RETURN jsonb_build_object('ok', true, 'coupon_code', v_coupon_code);
END;
$function$;

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
  -- Skip if already has a welcome coupon
  IF EXISTS (SELECT 1 FROM public.spin_coupons WHERE user_id = NEW.user_id AND code LIKE 'WELCOME-%') THEN
    RETURN NEW;
  END IF;
  -- Skip if this user already has a referral link (acquisition reward already claimed)
  IF EXISTS (SELECT 1 FROM public.referrals WHERE invited_user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  v_code := 'WELCOME-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.spin_coupons(code, user_id, reward_type, reward_value, minimum_order_amount, expires_at)
  VALUES (v_code, NEW.user_id, 'fixed_amount', 15000, 100000, now() + interval '48 hours');
  RETURN NEW;
END;
$function$;
