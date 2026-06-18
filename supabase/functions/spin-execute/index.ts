import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-fingerprint",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REWARD_META: Record<string, { value: number; min: number }> = {
  coupon_5k: { value: 5000, min: 50000 },
  coupon_10k: { value: 10000, min: 100000 },
  extra_spin: { value: 1, min: 0 },
  gift_select: { value: 0, min: 150000 },
  coupon_50k: { value: 50000, min: 200000 },
  free_gift: { value: 0, min: 0 },
};

function weightedPick(probs: Record<string, number>, exclude: string[] = []): string {
  const entries = Object.entries(probs).filter(([k]) => !exclude.includes(k));
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const rnd = (crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff) * total;
  let acc = 0;
  for (const [k, v] of entries) {
    acc += v;
    if (rnd <= acc) return k;
  }
  return entries[0][0];
}

function genCouponCode(): string {
  return "SW-" + Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
    const fp = req.headers.get("x-device-fingerprint") || null;
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Try authenticated user first
    let user: { id: string; email_confirmed_at?: string | null; phone_confirmed_at?: string | null } | null = null;
    if (token) {
      const { data } = await supa.auth.getUser(token);
      user = data?.user ?? null;
    }

    // Load config (shared)
    const { data: cfg } = await supa.from("spin_config").select("*").eq("id", 1).maybeSingle();
    const probs = (cfg?.probabilities as Record<string, number>) || {
      coupon_5k: 45, coupon_10k: 25, extra_spin: 15, gift_select: 10, coupon_50k: 4, free_gift: 1,
    };
    const expiryHours = cfg?.reward_expiry_hours ?? 5;
    const spinExpiryHours = cfg?.spin_expiry_hours ?? 5;
    const signupSpins = cfg?.signup_spins ?? 3;
    const extraCap = cfg?.extra_spin_lifetime_cap ?? 2;

    // ===== GUEST FLOW =====
    if (!user) {
      if (!fp || fp.length < 4) return json({ error: "fingerprint_required" }, 400);

      // Get or create guest balance (3 free spins on first request)
      let { data: guest } = await supa
        .from("guest_spin_balances")
        .select("*")
        .eq("fingerprint", fp)
        .maybeSingle();

      if (!guest) {
        const expires = new Date(Date.now() + spinExpiryHours * 3600 * 1000).toISOString();
        const { data: inserted } = await supa
          .from("guest_spin_balances")
          .insert({ fingerprint: fp, available_spins: signupSpins, expires_at: expires, last_ip: ip })
          .select()
          .single();
        guest = inserted!;
      }

      // Expired?
      if (new Date(guest.expires_at).getTime() <= Date.now()) {
        return json({ error: "no_spins" }, 400);
      }
      if (guest.available_spins <= 0) {
        return json({ error: "no_spins" }, 400);
      }

      // Optimistic decrement
      const { error: decErr, data: dec } = await supa
        .from("guest_spin_balances")
        .update({ available_spins: guest.available_spins - 1, last_ip: ip })
        .eq("fingerprint", fp)
        .eq("available_spins", guest.available_spins)
        .select()
        .maybeSingle();
      if (decErr || !dec) return json({ error: "spin_conflict" }, 409);

      // Lifetime extra-spin cap for guests
      const { count: extraCount } = await supa
        .from("guest_spin_history")
        .select("id", { count: "exact", head: true })
        .eq("fingerprint", fp)
        .eq("reward_type", "extra_spin");

      const exclude: string[] = [];
      if ((extraCount ?? 0) >= extraCap) exclude.push("extra_spin");

      const reward = weightedPick(probs, exclude);
      const meta = REWARD_META[reward];
      let couponId: string | null = null;
      let couponCode: string | null = null;
      let giftProductId: string | null = null;

      if (reward === "extra_spin") {
        await supa
          .from("guest_spin_balances")
          .update({
            available_spins: dec.available_spins + 1,
            expires_at: new Date(Date.now() + spinExpiryHours * 3600 * 1000).toISOString(),
          })
          .eq("fingerprint", fp);
      } else if (reward === "free_gift") {
        const { data: gifts } = await supa
          .from("gift_rewards")
          .select("product_id, inventory")
          .eq("is_active", true)
          .eq("reward_tier", "free_gift")
          .gt("inventory", 0);
        if (gifts && gifts.length > 0) {
          giftProductId = gifts[Math.floor(Math.random() * gifts.length)].product_id;
        }
        couponCode = genCouponCode();
        const { data: c } = await supa
          .from("spin_coupons")
          .insert({
            code: couponCode,
            user_id: null,
            guest_fingerprint: fp,
            reward_type: giftProductId ? "free_gift" : "coupon_5k",
            reward_value: giftProductId ? 0 : 5000,
            minimum_order_amount: giftProductId ? 0 : 50000,
            expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
          })
          .select("id")
          .single();
        couponId = c?.id || null;
      } else {
        couponCode = genCouponCode();
        const { data: c } = await supa
          .from("spin_coupons")
          .insert({
            code: couponCode,
            user_id: null,
            guest_fingerprint: fp,
            reward_type: reward,
            reward_value: meta.value,
            minimum_order_amount: meta.min,
            expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
          })
          .select("id")
          .single();
        couponId = c?.id || null;
      }

      await supa.from("guest_spin_history").insert({
        fingerprint: fp,
        reward_type: reward,
        reward_value: meta.value,
        coupon_id: couponId,
        gift_product_id: giftProductId,
        ip,
      });

      return json({
        reward_type: reward,
        reward_value: meta.value,
        minimum_order_amount: meta.min,
        coupon_code: couponCode,
        gift_product_id: giftProductId,
        expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
        guest: true,
      });
    }

    // ===== AUTHENTICATED FLOW =====
    const { data: profile } = await supa
      .from("profiles")
      .select("email_verified, phone_verified")
      .eq("user_id", user.id)
      .maybeSingle();
    const verified =
      profile?.email_verified || profile?.phone_verified || !!user.email_confirmed_at || !!user.phone_confirmed_at;
    if (!verified) return json({ error: "verification_required" }, 403);

    const { data: batch } = await supa
      .from("spin_balances")
      .select("*")
      .eq("user_id", user.id)
      .gt("available_spins", 0)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!batch) return json({ error: "no_spins" }, 400);

    const { error: decErr } = await supa
      .from("spin_balances")
      .update({ available_spins: batch.available_spins - 1 })
      .eq("id", batch.id)
      .eq("available_spins", batch.available_spins);
    if (decErr) return json({ error: "spin_conflict" }, 409);

    const maxSpins = cfg?.max_active_spins ?? 6;

    const { count: extraCount } = await supa
      .from("spin_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("reward_type", "extra_spin");

    const exclude: string[] = [];
    if ((extraCount ?? 0) >= extraCap) exclude.push("extra_spin");

    const { data: activeSum } = await supa.rpc("user_active_spins", { _user_id: user.id });
    if ((activeSum as number) >= maxSpins) exclude.push("extra_spin");

    const reward = weightedPick(probs, exclude);
    const meta = REWARD_META[reward];

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let giftProductId: string | null = null;

    if (reward === "extra_spin") {
      await supa.from("spin_balances").insert({
        user_id: user.id,
        available_spins: 1,
        source: "extra",
        source_ref: crypto.randomUUID(),
        expires_at: new Date(Date.now() + spinExpiryHours * 3600 * 1000).toISOString(),
      });
    } else if (reward === "free_gift") {
      const { data: gifts } = await supa
        .from("gift_rewards")
        .select("product_id, inventory")
        .eq("is_active", true)
        .eq("reward_tier", "free_gift")
        .gt("inventory", 0);
      if (gifts && gifts.length > 0) {
        giftProductId = gifts[Math.floor(Math.random() * gifts.length)].product_id;
        couponCode = genCouponCode();
        const { data: c } = await supa.from("spin_coupons").insert({
          code: couponCode, user_id: user.id, reward_type: "free_gift",
          reward_value: 0, minimum_order_amount: 0,
          expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
        }).select("id").single();
        couponId = c?.id || null;
      } else {
        couponCode = genCouponCode();
        const { data: c } = await supa.from("spin_coupons").insert({
          code: couponCode, user_id: user.id, reward_type: "coupon_5k",
          reward_value: 5000, minimum_order_amount: 50000,
          expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
        }).select("id").single();
        couponId = c?.id || null;
      }
    } else {
      couponCode = genCouponCode();
      const { data: c } = await supa.from("spin_coupons").insert({
        code: couponCode, user_id: user.id, reward_type: reward,
        reward_value: meta.value, minimum_order_amount: meta.min,
        expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
      }).select("id").single();
      couponId = c?.id || null;
    }

    await supa.from("spin_history").insert({
      user_id: user.id, reward_type: reward, reward_value: meta.value,
      coupon_id: couponId, gift_product_id: giftProductId, ip, device_fingerprint: fp,
    });

    if (fp || ip) {
      await supa.from("profiles").update({
        device_fingerprint: fp ?? undefined,
        last_ip: ip ?? undefined,
      }).eq("user_id", user.id);
    }

    return json({
      reward_type: reward,
      reward_value: meta.value,
      minimum_order_amount: meta.min,
      coupon_code: couponCode,
      gift_product_id: giftProductId,
      expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
    });
  } catch (e) {
    console.error(e);
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
