
-- ============ EasyRewards: isolated new module ============

CREATE TABLE public.easy_rewards_settings (
  id integer PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT false,
  launch_date timestamptz NOT NULL DEFAULT now(),
  welcome_credit_amount numeric NOT NULL DEFAULT 5000,
  welcome_min_order numeric NOT NULL DEFAULT 50000,
  welcome_expiry_days integer NOT NULL DEFAULT 14,
  referral_credit_amount numeric NOT NULL DEFAULT 5000,
  referral_points integer NOT NULL DEFAULT 5000,
  referral_hold_days integer NOT NULL DEFAULT 7,
  referral_credit_expiry_days integer NOT NULL DEFAULT 30,
  referral_monthly_limit integer NOT NULL DEFAULT 10,
  referral_min_order numeric NOT NULL DEFAULT 50000,
  points_per_mnt numeric NOT NULL DEFAULT 0.001,
  point_value_mnt numeric NOT NULL DEFAULT 10,
  redemption_cap_percent numeric NOT NULL DEFAULT 20,
  points_expiry_months integer NOT NULL DEFAULT 12,
  engagement_monthly_cap integer NOT NULL DEFAULT 500,
  engagement_rules jsonb NOT NULL DEFAULT '{
    "daily_login": 1,
    "login_streak_7": 10,
    "reel_watch": 1, "reel_watch_daily_cap": 3,
    "reel_product_view": 2, "reel_wishlist": 2,
    "reel_order_bonus": 10,
    "reel_comment": 1, "reel_comment_daily_cap": 3,
    "review_text": 10, "review_photo": 30, "review_video": 50,
    "user_video_approved": 50, "user_video_featured_min": 100, "user_video_featured_max": 200,
    "user_video_monthly_cap": 5,
    "share_qualified": 2, "share_daily_cap": 3,
    "weekly_mission": 20
  }'::jsonb,
  category_multipliers jsonb NOT NULL DEFAULT '{}'::jsonb,
  sku_multipliers jsonb NOT NULL DEFAULT '{}'::jsonb,
  excluded_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaign_starts_at timestamptz,
  campaign_ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT easy_rewards_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.easy_rewards_settings TO anon, authenticated;
GRANT ALL ON public.easy_rewards_settings TO service_role;
ALTER TABLE public.easy_rewards_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_settings_read" ON public.easy_rewards_settings FOR SELECT USING (true);
CREATE POLICY "er_settings_admin_write" ON public.easy_rewards_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.easy_rewards_settings (id) VALUES (1);

CREATE TABLE public.easy_rewards_users (
  user_id uuid PRIMARY KEY,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  phone_verified_at timestamptz,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid,
  points_balance integer NOT NULL DEFAULT 0,
  credit_balance numeric NOT NULL DEFAULT 0,
  pending_points integer NOT NULL DEFAULT 0,
  pending_credit numeric NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  fraud_status text NOT NULL DEFAULT 'clear',
  welcome_granted_at timestamptz,
  welcome_consumed_at timestamptz,
  welcome_revoked_at timestamptz,
  device_fingerprint text,
  last_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT er_users_fraud_status_chk CHECK (fraud_status IN ('clear','review','blocked'))
);
GRANT SELECT ON public.easy_rewards_users TO authenticated;
GRANT ALL ON public.easy_rewards_users TO service_role;
ALTER TABLE public.easy_rewards_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_users_self_read" ON public.easy_rewards_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "er_users_admin_all" ON public.easy_rewards_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.easy_rewards_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  currency text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL,
  reason text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  order_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  parent_entry_id uuid REFERENCES public.easy_rewards_ledger(id),
  expires_at timestamptz,
  approved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT er_ledger_currency_chk CHECK (currency IN ('points','credit')),
  CONSTRAINT er_ledger_status_chk CHECK (status IN ('pending','approved','earned','redeemed','expired','reversed','cancelled','fraud_review'))
);
CREATE INDEX er_ledger_user_idx ON public.easy_rewards_ledger(user_id, currency, status);
CREATE INDEX er_ledger_expiry_idx ON public.easy_rewards_ledger(expires_at) WHERE status IN ('approved','earned');
CREATE INDEX er_ledger_order_idx ON public.easy_rewards_ledger(order_id);
GRANT SELECT ON public.easy_rewards_ledger TO authenticated;
GRANT ALL ON public.easy_rewards_ledger TO service_role;
ALTER TABLE public.easy_rewards_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_ledger_self_read" ON public.easy_rewards_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "er_ledger_admin_read" ON public.easy_rewards_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.er_ledger_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'EasyRewards ledger entries cannot be deleted';
  END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.amount <> OLD.amount OR NEW.currency <> OLD.currency
     OR NEW.idempotency_key <> OLD.idempotency_key OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'EasyRewards ledger entries are immutable';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END; $$;
CREATE TRIGGER er_ledger_no_delete BEFORE DELETE ON public.easy_rewards_ledger
  FOR EACH ROW EXECUTE FUNCTION public.er_ledger_immutable();
CREATE TRIGGER er_ledger_no_mutate BEFORE UPDATE ON public.easy_rewards_ledger
  FOR EACH ROW EXECUTE FUNCTION public.er_ledger_immutable();

CREATE TABLE public.easy_rewards_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL,
  invitee_user_id uuid NOT NULL UNIQUE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  qualifying_order_id uuid,
  delivered_at timestamptz,
  approved_at timestamptz,
  rejection_reason text,
  invitee_ledger_id uuid REFERENCES public.easy_rewards_ledger(id),
  inviter_ledger_id uuid REFERENCES public.easy_rewards_ledger(id),
  signup_ip text,
  signup_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT er_ref_status_chk CHECK (status IN ('pending','qualified','fraud_review','approved','rejected','cancelled'))
);
CREATE INDEX er_ref_inviter_idx ON public.easy_rewards_referrals(inviter_user_id, status);
GRANT SELECT ON public.easy_rewards_referrals TO authenticated;
GRANT ALL ON public.easy_rewards_referrals TO service_role;
ALTER TABLE public.easy_rewards_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_ref_self_read" ON public.easy_rewards_referrals FOR SELECT TO authenticated
  USING (inviter_user_id = auth.uid() OR invitee_user_id = auth.uid());
CREATE POLICY "er_ref_admin_all" ON public.easy_rewards_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.easy_rewards_engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  action_key text NOT NULL,
  event_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date,
  points_awarded integer NOT NULL DEFAULT 0,
  ledger_id uuid REFERENCES public.easy_rewards_ledger(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT er_engagement_unique UNIQUE (user_id, action_type, action_key)
);
CREATE INDEX er_engagement_daily_idx ON public.easy_rewards_engagement_events(user_id, action_type, event_date);
GRANT SELECT ON public.easy_rewards_engagement_events TO authenticated;
GRANT ALL ON public.easy_rewards_engagement_events TO service_role;
ALTER TABLE public.easy_rewards_engagement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_engagement_self_read" ON public.easy_rewards_engagement_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "er_engagement_admin_read" ON public.easy_rewards_engagement_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.easy_rewards_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  reels_watched integer NOT NULL DEFAULT 0,
  wishlist_added integer NOT NULL DEFAULT 0,
  login_days integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  ledger_id uuid REFERENCES public.easy_rewards_ledger(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT er_missions_unique UNIQUE (user_id, week_start)
);
GRANT SELECT ON public.easy_rewards_missions TO authenticated;
GRANT ALL ON public.easy_rewards_missions TO service_role;
ALTER TABLE public.easy_rewards_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_missions_self_read" ON public.easy_rewards_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "er_missions_admin_read" ON public.easy_rewards_missions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.easy_rewards_fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT er_fraud_status_chk CHECK (status IN ('open','approved','rejected','dismissed'))
);
GRANT SELECT ON public.easy_rewards_fraud_flags TO authenticated;
GRANT ALL ON public.easy_rewards_fraud_flags TO service_role;
ALTER TABLE public.easy_rewards_fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_fraud_admin_all" ON public.easy_rewards_fraud_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.easy_rewards_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid,
  admin_email text,
  action text NOT NULL,
  target_user_id uuid,
  target_id text,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.easy_rewards_audit_logs TO authenticated;
GRANT ALL ON public.easy_rewards_audit_logs TO service_role;
ALTER TABLE public.easy_rewards_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_audit_admin_read" ON public.easy_rewards_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.er_recompute_balance(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.easy_rewards_users u SET
    points_balance = GREATEST(0, COALESCE((
      SELECT SUM(amount) FROM public.easy_rewards_ledger
      WHERE user_id = _user_id AND currency = 'points' AND status IN ('approved','earned','redeemed','reversed','expired')
    ), 0))::integer,
    credit_balance = GREATEST(0, COALESCE((
      SELECT SUM(amount) FROM public.easy_rewards_ledger
      WHERE user_id = _user_id AND currency = 'credit' AND status IN ('approved','earned','redeemed','reversed','expired')
    ), 0)),
    pending_points = GREATEST(0, COALESCE((
      SELECT SUM(amount) FROM public.easy_rewards_ledger
      WHERE user_id = _user_id AND currency = 'points' AND status = 'pending'
    ), 0))::integer,
    pending_credit = GREATEST(0, COALESCE((
      SELECT SUM(amount) FROM public.easy_rewards_ledger
      WHERE user_id = _user_id AND currency = 'credit' AND status = 'pending'
    ), 0)),
    lifetime_points = GREATEST(0, COALESCE((
      SELECT SUM(amount) FROM public.easy_rewards_ledger
      WHERE user_id = _user_id AND currency = 'points' AND amount > 0 AND status IN ('approved','earned')
    ), 0))::integer,
    updated_at = now()
  WHERE u.user_id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.er_ledger_sync_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.er_recompute_balance(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER er_ledger_balance_sync AFTER INSERT OR UPDATE ON public.easy_rewards_ledger
  FOR EACH ROW EXECUTE FUNCTION public.er_ledger_sync_balance();

CREATE OR REPLACE FUNCTION public.er_is_eligible(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _launch timestamptz;
  _created timestamptz;
BEGIN
  SELECT launch_date INTO _launch FROM public.easy_rewards_settings WHERE id = 1;
  SELECT created_at INTO _created FROM auth.users WHERE id = _user_id;
  IF _created IS NULL OR _launch IS NULL OR _created < _launch THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.spin_coupons WHERE user_id = _user_id)
     OR EXISTS (SELECT 1 FROM public.wallet_credits WHERE user_id = _user_id)
     OR EXISTS (SELECT 1 FROM public.spin_history WHERE user_id = _user_id)
     OR EXISTS (SELECT 1 FROM public.referrals WHERE inviter_user_id = _user_id OR invited_user_id = _user_id)
     OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND loyalty_points > 0)
  THEN
    RETURN false;
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.er_generate_referral_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _code text; _exists boolean;
BEGIN
  LOOP
    _code := 'EASY-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.easy_rewards_users WHERE referral_code = _code) INTO _exists;
    EXIT WHEN NOT _exists;
  END LOOP;
  RETURN _code;
END; $$;

CREATE OR REPLACE FUNCTION public.er_enroll(_referral_code text DEFAULT NULL, _fingerprint text DEFAULT NULL)
RETURNS public.easy_rewards_users LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.easy_rewards_users;
  _enabled boolean;
  _inviter uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT is_enabled INTO _enabled FROM public.easy_rewards_settings WHERE id = 1;
  IF NOT COALESCE(_enabled, false) THEN RAISE EXCEPTION 'EasyRewards is not enabled'; END IF;

  SELECT * INTO _row FROM public.easy_rewards_users WHERE user_id = _uid;
  IF FOUND THEN RETURN _row; END IF;

  IF NOT public.er_is_eligible(_uid) THEN
    RAISE EXCEPTION 'not eligible for EasyRewards';
  END IF;

  IF _referral_code IS NOT NULL THEN
    SELECT user_id INTO _inviter FROM public.easy_rewards_users
      WHERE referral_code = upper(trim(_referral_code)) AND user_id <> _uid;
  END IF;

  INSERT INTO public.easy_rewards_users (user_id, referral_code, referred_by, device_fingerprint)
  VALUES (_uid, public.er_generate_referral_code(), _inviter, _fingerprint)
  RETURNING * INTO _row;

  IF _inviter IS NOT NULL THEN
    INSERT INTO public.easy_rewards_referrals (inviter_user_id, invitee_user_id, referral_code, signup_fingerprint)
    VALUES (_inviter, _uid, upper(trim(_referral_code)), _fingerprint)
    ON CONFLICT (invitee_user_id) DO NOTHING;
  END IF;

  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.er_post_ledger(
  _user_id uuid, _currency text, _amount numeric, _status text, _reason text,
  _source_type text, _source_id text DEFAULT NULL, _order_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL, _expires_at timestamptz DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb, _created_by uuid DEFAULT NULL
) RETURNS public.easy_rewards_ledger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.easy_rewards_ledger; _key text;
BEGIN
  _key := COALESCE(_idempotency_key, _source_type || ':' || _user_id::text || ':' || COALESCE(_source_id, gen_random_uuid()::text));
  SELECT * INTO _row FROM public.easy_rewards_ledger WHERE idempotency_key = _key;
  IF FOUND THEN RETURN _row; END IF;

  INSERT INTO public.easy_rewards_ledger
    (user_id, currency, amount, status, reason, source_type, source_id, order_id,
     idempotency_key, expires_at, metadata, created_by, approved_at)
  VALUES (_user_id, _currency, _amount, _status, _reason, _source_type, _source_id, _order_id,
     _key, _expires_at, COALESCE(_metadata, '{}'::jsonb), _created_by,
     CASE WHEN _status IN ('approved','earned') THEN now() ELSE NULL END)
  RETURNING * INTO _row;
  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.er_my_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _u public.easy_rewards_users; _s public.easy_rewards_settings;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('enrolled', false); END IF;
  SELECT * INTO _s FROM public.easy_rewards_settings WHERE id = 1;
  SELECT * INTO _u FROM public.easy_rewards_users WHERE user_id = _uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('enrolled', false, 'eligible', public.er_is_eligible(_uid), 'enabled', _s.is_enabled);
  END IF;
  RETURN jsonb_build_object(
    'enrolled', true, 'eligible', true, 'enabled', _s.is_enabled,
    'referral_code', _u.referral_code,
    'points_balance', _u.points_balance,
    'credit_balance', _u.credit_balance,
    'pending_points', _u.pending_points,
    'pending_credit', _u.pending_credit,
    'lifetime_points', _u.lifetime_points,
    'fraud_status', _u.fraud_status,
    'phone_verified_at', _u.phone_verified_at,
    'point_value_mnt', _s.point_value_mnt,
    'redemption_cap_percent', _s.redemption_cap_percent,
    'expiring_soon', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('currency', currency, 'amount', amount, 'expires_at', expires_at))
      FROM public.easy_rewards_ledger
      WHERE user_id = _uid AND status IN ('approved','earned') AND amount > 0
        AND expires_at IS NOT NULL AND expires_at < now() + interval '30 days'
    ), '[]'::jsonb)
  );
END; $$;

CREATE TRIGGER er_users_touch BEFORE UPDATE ON public.easy_rewards_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER er_referrals_touch BEFORE UPDATE ON public.easy_rewards_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER er_missions_touch BEFORE UPDATE ON public.easy_rewards_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER er_settings_touch BEFORE UPDATE ON public.easy_rewards_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
