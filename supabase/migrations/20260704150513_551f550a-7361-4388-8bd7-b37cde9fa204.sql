
CREATE TABLE IF NOT EXISTS public.wallet_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('referral','welcome','wheel','manual')),
  value_type TEXT NOT NULL CHECK (value_type IN ('fixed','percent')),
  value NUMERIC NOT NULL CHECK (value >= 0),
  max_discount_amount NUMERIC,
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired')),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  order_id UUID,
  source_coupon_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_credits_user_idx ON public.wallet_credits(user_id, status);
CREATE INDEX IF NOT EXISTS wallet_credits_source_idx ON public.wallet_credits(source_coupon_id);

GRANT SELECT ON public.wallet_credits TO authenticated;
GRANT ALL ON public.wallet_credits TO service_role;

ALTER TABLE public.wallet_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own wallet credits" ON public.wallet_credits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "admin manage wallet credits" ON public.wallet_credits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.wallet_credits (user_id, credit_type, value_type, value, min_order_amount, status, expires_at, used_at, order_id, source_coupon_id, created_at)
SELECT
  c.user_id,
  CASE
    WHEN c.code LIKE 'WELCOME-%' THEN 'welcome'
    WHEN c.code LIKE 'REF-%' OR c.code LIKE 'INV-%' THEN 'referral'
    ELSE 'wheel'
  END,
  CASE WHEN c.reward_type = 'percent' THEN 'percent' ELSE 'fixed' END,
  c.reward_value,
  COALESCE(c.minimum_order_amount, 0),
  CASE
    WHEN c.is_used THEN 'used'
    WHEN c.invalidated_at IS NOT NULL THEN 'expired'
    WHEN c.expires_at < now() THEN 'expired'
    ELSE 'active'
  END,
  c.expires_at, c.used_at, c.used_order_id, c.id, c.created_at
FROM public.spin_coupons c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.wallet_credits w WHERE w.source_coupon_id = c.id);

CREATE OR REPLACE FUNCTION public.mirror_spin_coupon_to_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_credits WHERE source_coupon_id = NEW.id) THEN RETURN NEW; END IF;
  INSERT INTO public.wallet_credits (user_id, credit_type, value_type, value, min_order_amount, status, expires_at, source_coupon_id, created_at)
  VALUES (
    NEW.user_id,
    CASE
      WHEN NEW.code LIKE 'WELCOME-%' THEN 'welcome'
      WHEN NEW.code LIKE 'REF-%' OR NEW.code LIKE 'INV-%' THEN 'referral'
      ELSE 'wheel'
    END,
    CASE WHEN NEW.reward_type = 'percent' THEN 'percent' ELSE 'fixed' END,
    GREATEST(NEW.reward_value, 0),
    COALESCE(NEW.minimum_order_amount, 0),
    'active',
    NEW.expires_at,
    NEW.id,
    NEW.created_at
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_spin_coupon ON public.spin_coupons;
CREATE TRIGGER trg_mirror_spin_coupon
AFTER INSERT ON public.spin_coupons
FOR EACH ROW EXECUTE FUNCTION public.mirror_spin_coupon_to_wallet();

CREATE OR REPLACE FUNCTION public.sync_spin_coupon_to_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.wallet_credits
  SET status = CASE
        WHEN NEW.is_used THEN 'used'
        WHEN NEW.invalidated_at IS NOT NULL THEN 'expired'
        WHEN NEW.expires_at < now() THEN 'expired'
        ELSE status
      END,
      used_at = COALESCE(NEW.used_at, used_at),
      order_id = COALESCE(NEW.used_order_id, order_id)
  WHERE source_coupon_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_spin_coupon ON public.spin_coupons;
CREATE TRIGGER trg_sync_spin_coupon
AFTER UPDATE ON public.spin_coupons
FOR EACH ROW EXECUTE FUNCTION public.sync_spin_coupon_to_wallet();

CREATE OR REPLACE FUNCTION public.get_my_wallet_credits()
RETURNS SETOF public.wallet_credits
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.wallet_credits
  WHERE user_id = auth.uid()
  ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'used' THEN 1 ELSE 2 END, created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.redeem_wallet_credit(_credit_id UUID, _order_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.wallet_credits;
BEGIN
  SELECT * INTO v FROM public.wallet_credits WHERE id = _credit_id FOR UPDATE;
  IF v.id IS NULL OR v.user_id <> auth.uid() OR v.status <> 'active' THEN RETURN false; END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    UPDATE public.wallet_credits SET status='expired' WHERE id = v.id;
    RETURN false;
  END IF;
  UPDATE public.wallet_credits SET status='used', used_at=now(), order_id=_order_id WHERE id = v.id;
  IF v.source_coupon_id IS NOT NULL THEN
    UPDATE public.spin_coupons SET is_used = true, used_at = now(), used_order_id = _order_id
      WHERE id = v.source_coupon_id AND is_used = false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_wallet_credit(
  _user_id UUID, _value_type TEXT, _value NUMERIC,
  _min_order_amount NUMERIC DEFAULT 0,
  _max_discount_amount NUMERIC DEFAULT NULL,
  _expires_in_days INT DEFAULT 30,
  _note TEXT DEFAULT NULL
) RETURNS public.wallet_credits
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.wallet_credits;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Access denied'; END IF;
  INSERT INTO public.wallet_credits(user_id, credit_type, value_type, value, min_order_amount, max_discount_amount, expires_at, note)
  VALUES (_user_id, 'manual', _value_type, _value, COALESCE(_min_order_amount,0), _max_discount_amount,
          CASE WHEN _expires_in_days IS NULL THEN NULL ELSE now() + make_interval(days => _expires_in_days) END,
          _note)
  RETURNING * INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_wallet_credits(_limit INT DEFAULT 200)
RETURNS TABLE (
  id UUID, user_id UUID, user_email TEXT, user_name TEXT,
  credit_type TEXT, value_type TEXT, value NUMERIC, max_discount_amount NUMERIC,
  min_order_amount NUMERIC, status TEXT, expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ, order_id UUID, note TEXT, created_at TIMESTAMPTZ
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT w.id, w.user_id, u.email::text, p.full_name,
         w.credit_type, w.value_type, w.value, w.max_discount_amount,
         w.min_order_amount, w.status, w.expires_at,
         w.used_at, w.order_id, w.note, w.created_at
  FROM public.wallet_credits w
  LEFT JOIN auth.users u ON u.id = w.user_id
  LEFT JOIN public.profiles p ON p.user_id = w.user_id
  ORDER BY w.created_at DESC
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_wallet_credit(_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Access denied'; END IF;
  DELETE FROM public.wallet_credits WHERE id = _id;
  RETURN true;
END;
$$;
