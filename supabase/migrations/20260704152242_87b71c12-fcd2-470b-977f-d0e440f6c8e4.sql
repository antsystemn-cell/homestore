
-- 1) Stop free signup spins going forward
DROP TRIGGER IF EXISTS trg_grant_signup_spins ON public.profiles;

-- 2) Zero out free-spin sources and enable spin engine (order-only)
UPDATE public.spin_config
SET signup_spins = 0,
    referral_spins = 0,
    invitee_referral_spins = 0,
    is_enabled = true,
    updated_at = now()
WHERE id = 1;

-- 3) Allow 'order' as a spin source
ALTER TABLE public.spin_balances
  DROP CONSTRAINT IF EXISTS spin_balances_source_check;
ALTER TABLE public.spin_balances
  ADD CONSTRAINT spin_balances_source_check
  CHECK (source = ANY (ARRAY['signup','referral','extra','admin','order']));

-- 4) Grant exactly ONE spin per confirmed order (idempotent via unique key)
CREATE OR REPLACE FUNCTION public.grant_order_spin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.spin_config;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  -- Only when transitioning INTO confirmed/paid/delivered (first-touch)
  IF NEW.status NOT IN ('confirmed','paid','delivered','completed') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT * INTO v_cfg FROM public.spin_config WHERE id = 1;
  IF v_cfg.id IS NULL OR NOT COALESCE(v_cfg.is_enabled,false) THEN RETURN NEW; END IF;

  INSERT INTO public.spin_balances(user_id, available_spins, source, source_ref, expires_at)
  VALUES (
    NEW.user_id, 1, 'order', NEW.id::text,
    now() + (COALESCE(v_cfg.spin_expiry_hours,24) || ' hours')::interval
  )
  ON CONFLICT (user_id, source, source_ref) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_order_spin_ins ON public.orders;
DROP TRIGGER IF EXISTS trg_grant_order_spin_upd ON public.orders;

CREATE TRIGGER trg_grant_order_spin_ins
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.grant_order_spin();

CREATE TRIGGER trg_grant_order_spin_upd
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.grant_order_spin();

-- 5) Helper: signed-in user's own order count (for VIP badge on Profile)
CREATE OR REPLACE FUNCTION public.get_my_order_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(count(*),0)::int
  FROM public.orders
  WHERE user_id = auth.uid()
    AND status IN ('completed','delivered','confirmed','delivering','paid');
$$;

GRANT EXECUTE ON FUNCTION public.get_my_order_count() TO authenticated;
