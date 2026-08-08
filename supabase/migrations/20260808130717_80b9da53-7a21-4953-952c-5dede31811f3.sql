
DROP POLICY IF EXISTS "guest_spin_balances public read" ON public.guest_spin_balances;
DROP POLICY IF EXISTS "guest_spin_history public read" ON public.guest_spin_history;
DROP POLICY IF EXISTS "guests read own coupons by fp" ON public.spin_coupons;

CREATE OR REPLACE FUNCTION public.get_guest_spin_balance(_fp text)
RETURNS TABLE(available_spins integer, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.available_spins, b.expires_at
  FROM public.guest_spin_balances b
  WHERE _fp IS NOT NULL AND length(_fp) >= 8 AND b.fingerprint = _fp
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_guest_coupons(_fp text)
RETURNS SETOF public.spin_coupons
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.* FROM public.spin_coupons c
  WHERE _fp IS NOT NULL AND length(_fp) >= 8 AND c.guest_fingerprint = _fp
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_spin_balance(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_coupons(text) TO anon, authenticated;
