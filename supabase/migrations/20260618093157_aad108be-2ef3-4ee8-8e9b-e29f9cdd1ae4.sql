INSERT INTO public.spin_balances (user_id, available_spins, source, source_ref, expires_at)
SELECT p.user_id,
       (SELECT signup_spins FROM public.spin_config WHERE id = 1),
       'signup',
       p.user_id::text,
       now() + ((SELECT spin_expiry_hours FROM public.spin_config WHERE id = 1) || ' hours')::interval
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.spin_balances b
  WHERE b.user_id = p.user_id AND b.source = 'signup' AND b.source_ref = p.user_id::text
)
ON CONFLICT (user_id, source, source_ref) DO NOTHING;