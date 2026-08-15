
REVOKE ALL ON FUNCTION public.er_enroll(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.er_my_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.er_is_eligible(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.er_post_ledger(uuid, text, numeric, text, text, text, text, uuid, text, timestamptz, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.er_recompute_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.er_generate_referral_code() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.er_enroll(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.er_my_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.er_is_eligible(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.er_post_ledger(uuid, text, numeric, text, text, text, text, uuid, text, timestamptz, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.er_recompute_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.er_generate_referral_code() TO service_role;
