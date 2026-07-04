// Scans for delivered orders whose product reorder cycle has elapsed and enqueues SMS reminders.
// Triggered by cron daily.
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

  if (!cfg || !cfg.reorder_enabled) {
    return new Response(JSON.stringify({ ok: true, skipped: "reorder_disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pull delivered orders from last 180 days (broad enough for typical cycles)
  const since = new Date(Date.now() - 180 * 86400_000).toISOString();
  const { data: orders, error } = await admin
    .from("orders")
    .select("id, user_id, items, delivered_at, created_at")
    .eq("status", "delivered")
    .not("user_id", "is", null)
    .gte("created_at", since)
    .limit(1000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Collect unique product ids to fetch reorder cycle
  const productIds = new Set<string>();
  for (const o of orders ?? []) {
    for (const it of (o.items as any[]) ?? []) {
      if (it?.product_id) productIds.add(String(it.product_id));
    }
  }
  const { data: products } = await admin
    .from("products")
    .select("id, name, average_reorder_days")
    .in("id", Array.from(productIds));
  const productMap = new Map<string, { name: string; days: number | null }>();
  for (const p of products ?? []) {
    productMap.set(p.id, { name: p.name, days: p.average_reorder_days });
  }

  const now = Date.now();
  let sent = 0;
  let checked = 0;

  for (const o of orders ?? []) {
    const baseTs = new Date(o.delivered_at ?? o.created_at).getTime();
    for (const it of (o.items as any[]) ?? []) {
      const pid = it?.product_id ? String(it.product_id) : null;
      if (!pid) continue;
      const p = productMap.get(pid);
      if (!p?.days || p.days <= 0) continue;

      const dueAt = baseTs + p.days * 86400_000;
      // Fire within a 3-day window after due
      if (now < dueAt || now > dueAt + 3 * 86400_000) continue;

      checked++;

      // Skip if already reminded for this user+product from this order onwards
      const { count: prior } = await admin
        .from("reminder_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", o.user_id)
        .eq("product_id", pid)
        .eq("kind", "reorder")
        .gte("created_at", new Date(baseTs).toISOString());
      if ((prior ?? 0) > 0) continue;

      // Skip if user re-purchased this product since baseTs
      const { data: laterOrders } = await admin
        .from("orders")
        .select("id, items")
        .eq("user_id", o.user_id)
        .gt("created_at", new Date(baseTs).toISOString())
        .in("status", ["completed", "delivered", "confirmed", "delivering", "paid"]);
      const repurchased = (laterOrders ?? []).some((lo) =>
        ((lo.items as any[]) ?? []).some((li) => String(li?.product_id) === pid),
      );
      if (repurchased) continue;

      const { data: profile } = await admin
        .from("profiles")
        .select("phone, sms_reminders_consent")
        .eq("user_id", o.user_id)
        .maybeSingle();

      const message = String(cfg.reorder_message_template ?? "{product} дахин захиалах цаг болжээ. {link}")
        .replace("{product}", p.name)
        .replace("{link}", cfg.order_link_base ?? "");

      // Always create in-app notification
      await admin.from("in_app_notifications").insert({
        user_id: o.user_id,
        kind: "reorder",
        title: "Дахин захиалах цаг боллоо ⏰",
        message: `${p.name} дуусах цаг болсон байх. Дахин захиалах уу?`,
        link_url: "/",
        metadata: { product_id: pid, product_name: p.name, order_id: o.id },
      });

      // Optional SMS if user has consent + phone
      let smsStatus: "sent" | "queued" | "failed" | "skipped" = "skipped";
      let smsResponse = "in-app only";
      if (profile?.sms_reminders_consent && profile?.phone) {
        const result = await sendSms(cfg.sms_provider, cfg.sms_sender, profile.phone, message);
        smsStatus = result.status;
        smsResponse = result.response;
        if (result.status === "sent") sent++;
      }

      await admin.from("reminder_log").insert({
        user_id: o.user_id,
        kind: "reorder",
        product_id: pid,
        order_id: o.id,
        phone: profile?.phone ?? null,
        message,
        status: smsStatus,
        provider: cfg.sms_provider,
        provider_response: smsResponse,
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, checked, sent, orders: orders?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
