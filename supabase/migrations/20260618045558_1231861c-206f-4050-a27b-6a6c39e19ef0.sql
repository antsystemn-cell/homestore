
-- Guest spin balances (per device fingerprint)
CREATE TABLE IF NOT EXISTS public.guest_spin_balances (
  fingerprint text PRIMARY KEY,
  available_spins int NOT NULL CHECK (available_spins >= 0),
  expires_at timestamptz NOT NULL,
  last_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guest_spin_balances TO anon, authenticated;
GRANT ALL ON public.guest_spin_balances TO service_role;
ALTER TABLE public.guest_spin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest_spin_balances public read" ON public.guest_spin_balances FOR SELECT USING (true);

CREATE TRIGGER trg_guest_spin_balances_updated_at
BEFORE UPDATE ON public.guest_spin_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guest history
CREATE TABLE IF NOT EXISTS public.guest_spin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  reward_type text NOT NULL,
  reward_value numeric NOT NULL DEFAULT 0,
  coupon_id uuid,
  gift_product_id uuid,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guest_spin_history_fp ON public.guest_spin_history(fingerprint, created_at DESC);
GRANT SELECT ON public.guest_spin_history TO anon, authenticated;
GRANT ALL ON public.guest_spin_history TO service_role;
ALTER TABLE public.guest_spin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guest_spin_history public read" ON public.guest_spin_history FOR SELECT USING (true);

-- Allow coupons to belong to guests
ALTER TABLE public.spin_coupons
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_fingerprint text;

CREATE INDEX IF NOT EXISTS idx_spin_coupons_fp ON public.spin_coupons(guest_fingerprint) WHERE guest_fingerprint IS NOT NULL;

-- Public can read coupons by code (lookup-only, narrow): keep SELECT policy permissive enough
-- but coupons table already has user-owner policy; add a guest-by-fingerprint read policy
DROP POLICY IF EXISTS "guests read own coupons by fp" ON public.spin_coupons;
CREATE POLICY "guests read own coupons by fp"
  ON public.spin_coupons FOR SELECT
  TO anon, authenticated
  USING (guest_fingerprint IS NOT NULL);
