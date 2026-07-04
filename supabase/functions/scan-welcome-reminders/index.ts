// Scans welcome coupons expiring in the next 24 hours and enqueues one-time
// reminders. In-site banner is rendered from the same coupon data in the
// frontend (WelcomeBonus component); this function handles the SMS side and
// records the reminder in reminder_log so it fires at most once per coupon.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendSms(
  provider: string,
  sender: string,
  to: string,
  body: string,
): Promise<{ status: "sent" | "queued" | "failed"; response: string }> {
  if (provider === "twilio") {
    const key = Deno.env.get("TWILIO_API_KEY");
    const from = Deno.env.get("TWILIO_FROM_NUMBER") ?? sender;
    if (!key) return { status: "queued", response: "TWILIO_API_KEY missing" };
    try {
      const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY") ?? ""}`,
          "X-Connection-Api-Key": key,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });
      const t = await res.text();
      return { status: res.ok ? "sent" : "failed", response: t.slice(0, 400) };
    } catch (e) {
      return { status: "failed", response: String(e).slice(0, 400) };
    }
  }
  if (provider === "gatewayapi") {
    const key = Deno.env.get("GATEWAYAPI_API_KEY");
    if (!key) return { status: "queued", response: "GATEWAYAPI_API_KEY missing" };
    try {
      const digits = to.replace(/\D/g, "");
      const res = await fetch("https://connector-gateway.lovable.dev/gatewayapi/mobile/single", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY") ?? ""}`,
          "X-Connection-Api-Key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sender, recipient: Number(digits), message: body }),
      });
      const t = await res.text();
      return { status: res.ok ? "sent" : "failed", response: t.slice(0, 400) };
    } catch (e) {
      return { status: "failed", response: String(e).slice(0, 400) };
    }
  }
  return { status: "queued", response: "provider=none (SMS not sent; enqueued only)" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: cfg } = await admin
    .from("reminder_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const provider = cfg?.sms_provider ?? "none";
  const sender = cfg?.sms_sender ?? "easyshop";
  const link = cfg?.order_link_base ?? "https://easyshop.mn";

  const now = Date.now();
  const in24h = new Date(now + 24 * 3600_000).toISOString();
  const nowIso = new Date(now).toISOString();

  // Welcome coupons expiring in the next 24h, unused, not invalidated
  const { data: coupons, error } = await admin
    .from("spin_coupons")
    .select("id, code, user_id, reward_value, minimum_order_amount, expires_at, is_used, invalidated_at")
    .like("code", "WELCOME-%")
    .eq("is_used", false)
    .is("invalidated_at", null)
    .gt("expires_at", nowIso)
    .lt("expires_at", in24h)
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let sent = 0;

  for (const c of coupons ?? []) {
    if (!c.user_id) continue;

    // One reminder per coupon (dedupe via reminder_log.order_id — reuse to store coupon id)
    const { count: already } = await admin
      .from("reminder_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", c.user_id)
      .eq("kind", "welcome_expiry")
      .eq("order_id", c.id);
    if ((already ?? 0) > 0) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("phone, sms_reminders_consent")
      .eq("user_id", c.user_id)
      .maybeSingle();

    processed++;

    const message = `Тавтай морил купон ${c.code} 24 цагийн дотор дуусна. ${Number(c.reward_value).toLocaleString("mn-MN")}₮ хямдралаа аваарай: ${link}`;

    if (!profile?.sms_reminders_consent || !profile?.phone) {
      await admin.from("reminder_log").insert({
        user_id: c.user_id,
        kind: "welcome_expiry",
        order_id: c.id,
        phone: profile?.phone ?? null,
        message,
        status: "skipped",
        provider_response: "(no consent or no phone; in-site banner only)",
      });
      continue;
    }

    const result = await sendSms(provider, sender, profile.phone, message);

    await admin.from("reminder_log").insert({
      user_id: c.user_id,
      kind: "welcome_expiry",
      order_id: c.id,
      phone: profile.phone,
      message,
      status: result.status,
      provider,
      provider_response: result.response,
    });

    if (result.status === "sent") sent++;
  }

  return new Response(JSON.stringify({ ok: true, scanned: coupons?.length ?? 0, processed, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
