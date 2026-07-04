
-- Loyalty system: columns, config table, triggers, admin function

-- 1. Add loyalty columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0;

-- 2. Loyalty config singleton
CREATE TABLE IF NOT EXISTS public.loyalty_config (
  id integer PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  earn_rate_percent numeric NOT NULL DEFAULT 1,          -- % of order awarded as points
  points_per_mnt numeric NOT NULL DEFAULT 1,             -- 1 point = X ₮ discount
  vip_threshold integer NOT NULL DEFAULT 3,              -- orders needed for VIP
  min_redeem_points integer NOT NULL DEFAULT 100,        -- minimum points to redeem
  max_redeem_percent numeric NOT NULL DEFAULT 100,       -- max % of order redeemable
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_config_singleton CHECK (id = 1)
);

GRANT SELECT ON public.loyalty_config TO anon, authenticated;
GRANT ALL ON public.loyalty_config TO service_role;

ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_config_read" ON public.loyalty_config;
CREATE POLICY "loyalty_config_read" ON public.loyalty_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "loyalty_config_admin_write" ON public.loyalty_config;
CREATE POLICY "loyalty_config_admin_write" ON public.loyalty_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.loyalty_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_loyalty_config_updated_at ON public.loyalty_config;
CREATE TRIGGER update_loyalty_config_updated_at
  BEFORE UPDATE ON public.loyalty_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Award points when order delivered
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_delivered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg public.loyalty_config;
  v_earn integer;
  v_base numeric;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status <> 'delivered' OR OLD.status = 'delivered' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.points_earned,0) > 0 THEN RETURN NEW; END IF;

  SELECT * INTO v_cfg FROM public.loyalty_config WHERE id = 1;
  IF v_cfg.id IS NULL OR NOT v_cfg.is_enabled THEN RETURN NEW; END IF;

  v_base := GREATEST(0, COALESCE(NEW.total,0) - COALESCE(NEW.delivery_fee,0));
  v_earn := floor(v_base * v_cfg.earn_rate_percent / 100.0)::int;
  IF v_earn <= 0 THEN RETURN NEW; END IF;

  UPDATE public.profiles SET loyalty_points = COALESCE(loyalty_points,0) + v_earn WHERE user_id = NEW.user_id;
  NEW.points_earned := v_earn;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_loyalty_points ON public.orders;
CREATE TRIGGER trg_award_loyalty_points
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_points_on_delivered();

-- 4. Deduct points when order redeems them
CREATE OR REPLACE FUNCTION public.redeem_points_on_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current integer;
BEGIN
  IF NEW.user_id IS NULL OR COALESCE(NEW.points_redeemed,0) <= 0 THEN RETURN NEW; END IF;
  SELECT COALESCE(loyalty_points,0) INTO v_current FROM public.profiles WHERE user_id = NEW.user_id FOR UPDATE;
  IF v_current < NEW.points_redeemed THEN
    RAISE EXCEPTION 'Insufficient loyalty points (have %, need %)', v_current, NEW.points_redeemed;
  END IF;
  UPDATE public.profiles SET loyalty_points = v_current - NEW.points_redeemed WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_redeem_loyalty_points ON public.orders;
CREATE TRIGGER trg_redeem_loyalty_points
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.redeem_points_on_order();

-- 5. Refund redeemed points on cancel
CREATE OR REPLACE FUNCTION public.refund_points_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN RETURN NEW; END IF;
  IF COALESCE(OLD.points_redeemed,0) > 0 THEN
    UPDATE public.profiles SET loyalty_points = COALESCE(loyalty_points,0) + OLD.points_redeemed WHERE user_id = NEW.user_id;
  END IF;
  IF COALESCE(OLD.points_earned,0) > 0 THEN
    UPDATE public.profiles SET loyalty_points = GREATEST(0, COALESCE(loyalty_points,0) - OLD.points_earned) WHERE user_id = NEW.user_id;
    NEW.points_earned := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_loyalty_points ON public.orders;
CREATE TRIGGER trg_refund_loyalty_points
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.refund_points_on_cancel();

-- 6. Update admin_list_users to use config vip_threshold
DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, phone text, address text, avatar_url text,
  email text, created_at timestamptz,
  loyalty_points integer, order_count integer, is_vip boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_threshold int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT COALESCE(vip_threshold,3) INTO v_threshold FROM public.loyalty_config WHERE id = 1;
  v_threshold := COALESCE(v_threshold, 3);

  RETURN QUERY
  SELECT p.id, p.user_id, p.full_name, p.phone, p.address, p.avatar_url,
         u.email::text, p.created_at,
         COALESCE(p.loyalty_points,0),
         COALESCE(oc.cnt,0)::int,
         (COALESCE(oc.cnt,0) >= v_threshold)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS cnt FROM public.orders o
    WHERE o.user_id = p.user_id
      AND o.status IN ('completed','delivered','confirmed','delivering','paid')
  ) oc ON true
  ORDER BY p.created_at DESC;
END;
$$;
