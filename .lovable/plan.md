## Spin & Win Gamification System

A complete spin-the-wheel rewards system with referrals, anti-fraud, coupons, and admin controls — integrated into the existing Homestore Mongolia (EasyShop) store.

### 1. Database (new tables, public schema, with GRANTs + RLS)

- **spin_balances** — `user_id`, `available_spins`, `expires_at`, `source` (signup/referral/extra), `consumed` (bool). One row per granted batch so 5-hour expiry is per-batch.
- **spin_history** — `user_id`, `reward_type`, `reward_value`, `coupon_id` (nullable), `gift_product_id` (nullable), `ip`, `device_fingerprint`, `created_at`.
- **referrals** — `inviter_user_id`, `invited_user_id` (unique), `invited_phone`, `invited_ip`, `invited_fingerprint`, `rewarded_spins`, `status` (pending/verified/rewarded), `created_at`.
- **spin_coupons** — `code` (unique), `user_id`, `reward_type` (`coupon_5k`/`coupon_10k`/`coupon_50k`), `reward_value`, `minimum_order_amount`, `expires_at`, `is_used`, `used_order_id`, `created_at`.
- **gift_rewards** — `product_id` (FK products), `inventory`, `is_active`. Admin-managed.
- **gift_redemptions** — `user_id`, `product_id`, `coupon_id` (the gift-selection token), `order_id`, `claimed_at`.
- **spin_config** — singleton row: reward probabilities (jsonb), reward expiry hours, signup spins, referral spins, max active spins, daily referral cap, extra-spin lifetime cap.
- **referral_codes** — extend `profiles` with `referral_code` (unique, auto-generated via trigger).
- **profiles** additions: `phone_verified` (bool), `email_verified` mirror, `device_fingerprint` last seen.

All new tables: `GRANT` to `authenticated` + `service_role`; admin-only writes for config and gift_rewards; users read only their own rows.

### 2. Backend (edge functions, server-validated)

- `spin-grant` — called on email/phone verification: insert 3-spin batch with 5h expiry (idempotent per user via unique source key).
- `spin-execute` — the only endpoint that picks a reward:
  1. Auth required + verified flag.
  2. Lock available spin batch (decrement), reject if none.
  3. Load `spin_config`, validate probabilities sum=100.
  4. Run server-side weighted RNG with `crypto.randomInt`.
  5. Apply per-user caps (Extra spin ≤ 2 lifetime — re-roll excluding it if hit).
  6. Materialize reward: insert `spin_coupons` row (5h expiry) or grant +1 spin (respect max 6) or create gift-selection coupon.
  7. Log to `spin_history` with IP + fingerprint.
- `referral-verify` — called after invited user verifies: validates inviter, dedupes by invited_user_id/phone/IP/fingerprint, enforces 3-per-day cap, grants inviter 2 spins (capped at max 6 active).
- `coupon-apply` — checkout-time validation: ownership, expiry, min order, not used, no stacking, not refunded.
- `coupon-invalidate-on-refund` — trigger or function called when order refunded.

### 3. Frontend

- **SpinWheel component** (`src/components/spin/SpinWheel.tsx`) — animated wheel, calls `spin-execute`, displays result with toast and confetti.
- **SpinModal** — entry point with current balance, expiry countdown, referral link copy, share buttons (Messenger/Facebook).
- **Spin entry button** — floating button on Home + bottom nav badge showing active spin count.
- **Referral page** (`/referral`) — code, link, list of referred users, daily counter.
- **Checkout integration** — coupon selector showing user's valid `spin_coupons`; gift picker when a gift-selection coupon is active (lists active `gift_rewards` with stock>0); applies 0₮ gift line item.
- **AuthPage hook** — capture `?ref=CODE` query param, store, attach to referral row after signup.
- **Device fingerprint** — lightweight FingerprintJS-open-source equivalent (custom canvas+UA hash) saved on signup and each spin.

### 4. Admin dashboard (extend AdminPage)

New tab "Spin & Win":
- Config form: probability sliders (live sum validation must =100), expiry hours, signup/referral spin counts, daily cap, lifetime extra-spin cap.
- Gift Rewards manager: add/remove products, set inventory, toggle active; auto-hide when inventory=0.
- Stats: total spins, reward distribution chart, coupon redemption rate, referrals leaderboard, registration conversion (visitors → verified), avg order value when coupon used vs not.

### 5. Anti-fraud

- Spin & referral writes happen only in edge functions with service role.
- Dedupe referrals by invited_user_id (unique), and check (phone, IP, fingerprint) against prior referred users in last 30 days.
- Rate-limit `spin-execute` to 1 req / 2s per user.
- Block referrals where inviter == invited.
- Verified email or phone required before any spin grant.

### Technical notes

- Stack: existing React/Vite/Supabase. No new heavy deps; small `@fingerprintjs/fingerprintjs` (open-source) and `canvas-confetti`.
- Language: Mongolian UI throughout, MNT/₮ currency.
- All new public tables follow GRANT + RLS pattern.
- Coupons reuse `spin_coupons` table; existing order flow extended to accept `coupon_code` on order creation and persist `applied_coupon_id` on `orders`.
- Refund invalidation: when order status moves to `refunded`/`cancelled` after coupon use, mark coupon `is_used=false` only if within validity, else expire; gift redemption rolled back and inventory restored.

### Out of scope (confirm if you want included)

- SMS phone verification provider — assumed already wired; if not, we'll add via Twilio/Supabase phone auth in a follow-up.
- Email/SMS notifications when spins are about to expire.
