
UPDATE public.spin_coupons
SET reward_value = 15000,
    expires_at = created_at + interval '48 hours'
WHERE code LIKE 'WELCOME-%'
  AND is_used = false
  AND invalidated_at IS NULL;

UPDATE public.wallet_credits wc
SET value = 15000,
    expires_at = sc.expires_at
FROM public.spin_coupons sc
WHERE wc.source_coupon_id = sc.id
  AND wc.credit_type = 'welcome'
  AND wc.status = 'active'
  AND sc.code LIKE 'WELCOME-%';
