import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-fingerprint",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await supa.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const referralCode: string | undefined = body.referral_code;

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
    const fp = req.headers.get("x-device-fingerprint") || null;

    // Mark profile verified (mirror auth state)
    const verified = !!user.email_confirmed_at || !!user.phone_confirmed_at;
    if (verified) {
      await supa
        .from("profiles")
        .update({
          email_verified: !!user.email_confirmed_at,
          phone_verified: !!user.phone_confirmed_at,
          device_fingerprint: fp,
          last_ip: ip,
        })
        .eq("user_id", user.id);
    } else {
      return json({ error: "not_verified" }, 403);
    }

    if (!referralCode) return json({ ok: true, referral_rewarded: false });

    // Find inviter
    const { data: inviter } = await supa
      .from("profiles")
      .select("user_id")
      .eq("referral_code", referralCode.toUpperCase())
      .maybeSingle();
    if (!inviter || inviter.user_id === user.id) {
      return json({ ok: true, referral_rewarded: false, reason: "invalid_inviter" });
    }

    // Already referred?
    const { data: existing } = await supa
      .from("referrals")
      .select("id, status")
      .eq("invited_user_id", user.id)
      .maybeSingle();
    if (existing?.status === "rewarded") {
      return json({ ok: true, referral_rewarded: false, reason: "already_rewarded" });
    }

    // Fraud: same phone / ip / fingerprint already referred in last 30 days
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const checks: Array<Promise<{ data: { id: string }[] | null }>> = [];
    if (user.phone) {
      checks.push(
        supa.from("referrals").select("id").eq("invited_phone", user.phone).gte("created_at", since).limit(1) as never,
      );
    }
    if (ip) {
      checks.push(
        supa.from("referrals").select("id").eq("invited_ip", ip).gte("created_at", since).limit(1) as never,
      );
    }
    if (fp) {
      checks.push(
        supa.from("referrals").select("id").eq("invited_fingerprint", fp).gte("created_at", since).limit(1) as never,
      );
    }
    const results = await Promise.all(checks);
    const dup = results.some((r) => (r.data?.length ?? 0) > 0);

    // Insert/upsert referral
    const status = dup ? "rejected" : "verified";
    await supa.from("referrals").upsert(
      {
        inviter_user_id: inviter.user_id,
        invited_user_id: user.id,
        invited_phone: user.phone || null,
        invited_email: user.email || null,
        invited_ip: ip,
        invited_fingerprint: fp,
        status,
        rejection_reason: dup ? "duplicate_signal" : null,
      },
      { onConflict: "invited_user_id" },
    );

    if (dup) return json({ ok: true, referral_rewarded: false, reason: "duplicate_signal" });

    // Daily cap check on inviter
    const { data: cfg } = await supa.from("spin_config").select("*").eq("id", 1).maybeSingle();
    const dailyCap = cfg?.daily_referral_cap ?? 3;
    const refSpins = cfg?.referral_spins ?? 2;
    const expiryHours = cfg?.spin_expiry_hours ?? 5;
    const maxSpins = cfg?.max_active_spins ?? 6;

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: todayCount } = await supa
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("inviter_user_id", inviter.user_id)
      .eq("status", "rewarded")
      .gte("rewarded_at", startOfDay.toISOString());
    if ((todayCount ?? 0) >= dailyCap) {
      return json({ ok: true, referral_rewarded: false, reason: "daily_cap" });
    }

    // Check inviter active spins for cap
    const { data: activeNow } = await supa.rpc("user_active_spins", { _user_id: inviter.user_id });
    const remaining = Math.max(0, maxSpins - (activeNow as number));
    const grant = Math.min(refSpins, remaining);
    if (grant > 0) {
      await supa.from("spin_balances").insert({
        user_id: inviter.user_id,
        available_spins: grant,
        source: "referral",
        source_ref: user.id,
        expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
      });
    }

    await supa
      .from("referrals")
      .update({ status: "rewarded", rewarded_spins: grant, rewarded_at: new Date().toISOString() })
      .eq("invited_user_id", user.id);

    // Set referred_by on profile
    await supa.from("profiles").update({ referred_by: inviter.user_id }).eq("user_id", user.id);

    return json({ ok: true, referral_rewarded: true, granted: grant });
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
