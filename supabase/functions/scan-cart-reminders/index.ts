// Scans for abandoned carts and enqueues SMS reminders.
// Triggered by cron every 15 minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CartItem {
  product?: { id: string; name: string };
  quantity?: number;
}

async function sendSms(
  admin: ReturnType<typeof createClient>,
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

  if (!cfg || !cfg.cart_enabled) {
    return new Response(JSON.stringify({ ok: true, skipped: "cart_disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const delayHours = Number(cfg.cart_delay_hours ?? 2);
  const cutoff = new Date(Date.now() - delayHours * 3600_000).toISOString();
  const remindCooldown = new Date(Date.now() - 24 * 3600_000).toISOString();

  // Find abandoned carts: updated_at older than cutoff, not reminded in last 24h
  const { data: carts, error } = await admin
    .from("active_carts")
    .select("user_id, items, updated_at, reminded_at")
    .lt("updated_at", cutoff)
    .or(`reminded_at.is.null,reminded_at.lt.${remindCooldown}`)
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let sent = 0;

  for (const cart of carts ?? []) {
    const items = (cart.items ?? []) as CartItem[];
    if (!items.length) continue;

    // Confirm no order placed since cart last updated
    const { count: orderCount } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", cart.user_id)
      .gte("created_at", cart.updated_at);

    if ((orderCount ?? 0) > 0) {
      // Cart converted; clear it
      await admin.from("active_carts").delete().eq("user_id", cart.user_id);
      continue;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("phone, sms_reminders_consent")
      .eq("user_id", cart.user_id)
      .maybeSingle();

    processed++;

    const productName = items[0]?.product?.name ?? "бараа";
    const itemCount = items.reduce((s, it) => s + (Number(it?.quantity) || 1), 0);
    const message = String(cfg.cart_message_template ?? "Таны сагсанд {product} үлдсэн байна. Захиалгаа үргэлжлүүлэх үү?")
      .replace("{product}", productName)
      .replace("{link}", cfg.order_link_base ?? "");

    // Always create in-app notification
    await admin.from("in_app_notifications").insert({
      user_id: cart.user_id,
      kind: "cart_abandoned",
      title: "Сагсаа мартчихав уу? 🛒",
      message: `${productName}${items.length > 1 ? ` болон ${items.length - 1} бусад бараа` : ""} таны сагсанд байна. Захиалгаа дуусгаарай!`,
      link_url: "/cart",
      metadata: { item_count: itemCount, product_count: items.length },
    });

    // Optional SMS if user has consent + phone
    let smsStatus: "sent" | "queued" | "failed" | "skipped" = "skipped";
    let smsResponse = "in-app only";
    if (profile?.sms_reminders_consent && profile?.phone) {
      const result = await sendSms(admin, cfg.sms_provider, cfg.sms_sender, profile.phone, message);
      smsStatus = result.status;
      smsResponse = result.response;
      if (result.status === "sent") sent++;
    }

    await admin.from("reminder_log").insert({
      user_id: cart.user_id,
      kind: "cart",
      phone: profile?.phone ?? null,
      message,
      status: smsStatus,
      provider: cfg.sms_provider,
      provider_response: smsResponse,
    });

    await admin
      .from("active_carts")
      .update({ reminded_at: new Date().toISOString() })
      .eq("user_id", cart.user_id);
  }

  return new Response(JSON.stringify({ ok: true, processed, sent, scanned: carts?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
