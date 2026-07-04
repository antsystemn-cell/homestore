
-- 1) Update referral code generator to prefixed format
CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'EASY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$function$;

-- 2) Backfill existing profiles that don't have EASY- prefix
UPDATE public.profiles
SET referral_code = 'EASY-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))
WHERE referral_code IS NULL OR referral_code = '' OR referral_code NOT LIKE 'EASY-%';

-- 3) Referral config knobs (store on loyalty_config? No, keep separate defaults inline).
-- Add columns to referrals for tracking coupon issuance
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS inviter_coupon_id uuid,
  ADD COLUMN IF NOT EXISTS invitee_coupon_id uuid,
  ADD COLUMN IF NOT EXISTS completed_order_id uuid;

-- 4) apply_referral_code: called after signup by authenticated invitee
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

  -- Only allow once per invited user
  SELECT id INTO v_existing FROM public.referrals WHERE invited_user_id = v_uid LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;

  -- Ensure the invitee has NOT already placed any order (must be brand new)
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'existing_customer');
  END IF;

  -- Issue 10% coupon to the invited user (single-use on first order)
  v_coupon_code := 'INV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.spin_coupons(code, user_id, reward_type, reward_value, minimum_order_amount, expires_at)
  VALUES (v_coupon_code, v_uid, 'percent', 10, 0, now() + interval '30 days')
  RETURNING id INTO v_coupon_id;

  INSERT INTO public.referrals(inviter_user_id, invited_user_id, status, invitee_coupon_id)
  VALUES (v_inviter, v_uid, 'pending', v_coupon_id);

  RETURN jsonb_build_object('ok', true, 'coupon_code', v_coupon_code);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;

-- 5) Trigger: when invited user's first order becomes delivered/completed, reward inviter 10,000₮ coupon
CREATE OR REPLACE FUNCTION public.reward_inviter_on_first_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref public.referrals;
  v_code text;
  v_coupon_id uuid;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('delivered','completed') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT * INTO v_ref FROM public.referrals
   WHERE invited_user_id = NEW.user_id AND status = 'pending'
   LIMIT 1;
  IF v_ref.id IS NULL THEN RETURN NEW; END IF;

  v_code := 'REF-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.spin_coupons(code, user_id, reward_type, reward_value, minimum_order_amount, expires_at)
  VALUES (v_code, v_ref.inviter_user_id, 'fixed_amount', 10000, 0, now() + interval '60 days')
  RETURNING id INTO v_coupon_id;

  UPDATE public.referrals
     SET status = 'rewarded',
         rewarded_at = now(),
         inviter_coupon_id = v_coupon_id,
         completed_order_id = NEW.id
   WHERE id = v_ref.id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reward_inviter_on_first_order ON public.orders;
CREATE TRIGGER trg_reward_inviter_on_first_order
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.reward_inviter_on_first_order();

-- 6) User-facing stats RPC
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
 RETURNS TABLE(invited_count integer, completed_count integer, pending_count integer, referral_code text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    invited_count := 0; completed_count := 0; pending_count := 0; referral_code := NULL;
    RETURN NEXT; RETURN;
  END IF;
  SELECT p.referral_code INTO referral_code FROM public.profiles p WHERE p.user_id = v_uid;
  SELECT count(*)::int INTO invited_count FROM public.referrals WHERE inviter_user_id = v_uid;
  SELECT count(*)::int INTO completed_count FROM public.referrals WHERE inviter_user_id = v_uid AND status = 'rewarded';
  pending_count := invited_count - completed_count;
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_stats() TO authenticated;

-- 7) Admin leaderboard RPC
CREATE OR REPLACE FUNCTION public.admin_referral_leaderboard(_limit integer DEFAULT 100)
 RETURNS TABLE(inviter_user_id uuid, full_name text, email text, referral_code text, invited_count integer, completed_count integer, last_invite_at timestamptz)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT r.inviter_user_id,
         p.full_name,
         u.email::text,
         p.referral_code,
         count(*)::int AS invited_count,
         count(*) FILTER (WHERE r.status = 'rewarded')::int AS completed_count,
         max(r.created_at) AS last_invite_at
  FROM public.referrals r
  LEFT JOIN public.profiles p ON p.user_id = r.inviter_user_id
  LEFT JOIN auth.users u ON u.id = r.inviter_user_id
  GROUP BY r.inviter_user_id, p.full_name, u.email, p.referral_code
  ORDER BY invited_count DESC, completed_count DESC
  LIMIT _limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_referral_leaderboard(integer) TO authenticated;

-- 8) Overall admin totals
CREATE OR REPLACE FUNCTION public.admin_referral_summary()
 RETURNS TABLE(total_invites integer, total_completed integer, total_inviters integer, total_reward_amount integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT count(*)::int,
         count(*) FILTER (WHERE status='rewarded')::int,
         count(DISTINCT inviter_user_id)::int,
         (count(*) FILTER (WHERE status='rewarded') * 10000)::int
  FROM public.referrals;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_referral_summary() TO authenticated;
