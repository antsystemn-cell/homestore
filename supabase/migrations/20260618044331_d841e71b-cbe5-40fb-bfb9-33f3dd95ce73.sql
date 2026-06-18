
-- =========================================================
-- SPIN & WIN: schema
-- =========================================================

-- 1. Extend profiles with referral_code + verification + fingerprint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS last_ip text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_set_profile_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_referral_code();

-- Backfill existing profiles
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- 2. spin_config singleton
CREATE TABLE IF NOT EXISTS public.spin_config (
  id int PRIMARY KEY DEFAULT 1,
  probabilities jsonb NOT NULL DEFAULT '{
    "coupon_5k": 45,
    "coupon_10k": 25,
    "extra_spin": 15,
    "gift_select": 10,
    "coupon_50k": 4,
    "free_gift": 1
  }'::jsonb,
  reward_expiry_hours int NOT NULL DEFAULT 5,
  spin_expiry_hours int NOT NULL DEFAULT 5,
  signup_spins int NOT NULL DEFAULT 3,
  referral_spins int NOT NULL DEFAULT 2,
  max_active_spins int NOT NULL DEFAULT 6,
  daily_referral_cap int NOT NULL DEFAULT 3,
  extra_spin_lifetime_cap int NOT NULL DEFAULT 2,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spin_config_singleton CHECK (id = 1)
);

INSERT INTO public.spin_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.spin_config TO authenticated, anon;
GRANT ALL ON public.spin_config TO service_role;
ALTER TABLE public.spin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spin_config readable" ON public.spin_config FOR SELECT USING (true);
CREATE POLICY "admin manage spin_config" ON public.spin_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. spin_balances
CREATE TABLE IF NOT EXISTS public.spin_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  available_spins int NOT NULL CHECK (available_spins >= 0),
  source text NOT NULL CHECK (source IN ('signup','referral','extra','admin')),
  source_ref text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, source_ref)
);
CREATE INDEX IF NOT EXISTS idx_spin_balances_user_active ON public.spin_balances(user_id, expires_at) WHERE available_spins > 0;
GRANT SELECT ON public.spin_balances TO authenticated;
GRANT ALL ON public.spin_balances TO service_role;
ALTER TABLE public.spin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own spins" ON public.spin_balances FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- 4. spin_history
CREATE TABLE IF NOT EXISTS public.spin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  reward_value numeric NOT NULL DEFAULT 0,
  coupon_id uuid,
  gift_product_id uuid,
  ip text,
  device_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spin_history_user ON public.spin_history(user_id, created_at DESC);
GRANT SELECT ON public.spin_history TO authenticated;
GRANT ALL ON public.spin_history TO service_role;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own history" ON public.spin_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- 5. referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_phone text,
  invited_email text,
  invited_ip text,
  invited_fingerprint text,
  rewarded_spins int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rewarded','rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  UNIQUE (invited_user_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON public.referrals(inviter_user_id, created_at DESC);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = inviter_user_id OR auth.uid() = invited_user_id OR public.has_role(auth.uid(),'admin'));

-- 6. spin_coupons
CREATE TABLE IF NOT EXISTS public.spin_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  reward_value numeric NOT NULL DEFAULT 0,
  minimum_order_amount numeric NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spin_coupons_user ON public.spin_coupons(user_id, expires_at);
GRANT SELECT ON public.spin_coupons TO authenticated;
GRANT ALL ON public.spin_coupons TO service_role;
ALTER TABLE public.spin_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own coupons" ON public.spin_coupons FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- 7. gift_rewards (admin-managed catalog of giftable products)
CREATE TABLE IF NOT EXISTS public.gift_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  inventory int NOT NULL DEFAULT 0 CHECK (inventory >= 0),
  is_active boolean NOT NULL DEFAULT true,
  reward_tier text NOT NULL DEFAULT 'gift_select' CHECK (reward_tier IN ('gift_select','free_gift')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, reward_tier)
);
GRANT SELECT ON public.gift_rewards TO authenticated, anon;
GRANT ALL ON public.gift_rewards TO service_role;
ALTER TABLE public.gift_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gift_rewards readable" ON public.gift_rewards FOR SELECT USING (true);
CREATE POLICY "admin manage gift_rewards" ON public.gift_rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_gift_rewards_updated_at
BEFORE UPDATE ON public.gift_rewards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. gift_redemptions
CREATE TABLE IF NOT EXISTS public.gift_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  coupon_id uuid REFERENCES public.spin_coupons(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gift_redemptions TO authenticated;
GRANT ALL ON public.gift_redemptions TO service_role;
ALTER TABLE public.gift_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own gift redemptions" ON public.gift_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- 9. orders: attach coupon
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS applied_coupon_id uuid REFERENCES public.spin_coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gift_redemption_id uuid REFERENCES public.gift_redemptions(id) ON DELETE SET NULL;

-- 10. Auto-grant signup spins when profile created (sync from auth handle_new_user)
CREATE OR REPLACE FUNCTION public.grant_signup_spins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.spin_config;
BEGIN
  SELECT * INTO v_cfg FROM public.spin_config WHERE id = 1;
  IF v_cfg.id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.spin_balances(user_id, available_spins, source, source_ref, expires_at)
  VALUES (NEW.user_id, v_cfg.signup_spins, 'signup', NEW.user_id::text,
          now() + (v_cfg.spin_expiry_hours || ' hours')::interval)
  ON CONFLICT (user_id, source, source_ref) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_signup_spins ON public.profiles;
CREATE TRIGGER trg_grant_signup_spins
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_signup_spins();

-- 11. Total-active-spins helper
CREATE OR REPLACE FUNCTION public.user_active_spins(_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(available_spins),0)::int
  FROM public.spin_balances
  WHERE user_id = _user_id AND expires_at > now() AND available_spins > 0
$$;

GRANT EXECUTE ON FUNCTION public.user_active_spins(uuid) TO authenticated, service_role;
