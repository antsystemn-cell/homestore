import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SONO_BASE = "https://rico.mn/api/w";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function sonoHeaders() {
  return {
    "x-and-auth-user": Deno.env.get("SONO_AUTH_USER") || "",
    "x-and-auth-token": Deno.env.get("SONO_AUTH_TOKEN") || "",
    "Content-Type": "application/json",
  };
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  // x-forwarded-for can be a comma-separated list; first entry = original client
  const first = fwd.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "";
}

function isIpAllowed(ip: string): boolean {
  const allowed = (Deno.env.get("SONO_WEBHOOK_ALLOWED_IPS") || "").trim();
  if (!allowed) return true; // no whitelist configured → allow all
  const list = allowed.split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(ip);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id");
    const invoiceIdFromQuery = url.searchParams.get("invoice_id");

    // IP whitelist enforcement
    const clientIp = getClientIp(req);
    if (!isIpAllowed(clientIp)) {
      console.warn("Sono webhook: blocked IP", clientIp);
      return new Response("Forbidden", { status: 403 });
    }

    let rawBody: any = null;
    try {
      rawBody = await req.json();
    } catch {
      /* Sono may POST empty body or form */
    }

    console.log("Sono webhook hit. ip:", clientIp, "order_id:", orderId, "invoice_id:", invoiceIdFromQuery, "body:", JSON.stringify(rawBody));

    if (!orderId) {
      return new Response("Missing order_id", { status: 400 });
    }

    const sb = getSupabaseAdmin();

    const { data: intent } = await sb
      .from("payment_intents")
      .select("*")
      .eq("order_id", orderId)
      .eq("provider", "SONO")
      .eq("status", "WAITING")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!intent) {
      console.log("No waiting Sono intent for order:", orderId);
      return new Response("OK", { status: 200 });
    }

    const invoiceData = intent.storepay_response as any;
    const invoiceId = invoiceIdFromQuery || invoiceData?.invoice_id;
    if (!invoiceId) {
      return new Response("OK", { status: 200 });
    }

    // Verify with Sono — never trust callback alone (idempotent)
    const checkRes = await fetch(`${SONO_BASE}/invoices/check`, {
      method: "POST",
      headers: sonoHeaders(),
      body: JSON.stringify({ invoice_id: invoiceId }),
    });

    const checkText = await checkRes.text();
    let checkData: any;
    try {
      checkData = JSON.parse(checkText);
    } catch {
      console.error("Sono webhook check parse fail:", checkText);
      return new Response("OK", { status: 200 });
    }

    console.log("Sono webhook verify:", JSON.stringify(checkData));

    const status = checkData?.response?.payment_status;

    if (status === "PAID") {
      await sb
        .from("payment_intents")
        .update({
          status: "PAID",
          storepay_response: {
            ...invoiceData,
            webhook_raw: rawBody,
            verify_check: checkData,
          },
        })
        .eq("id", intent.id);

      // Idempotent order update
      const { data: ord } = await sb
        .from("orders")
        .select("payment_status")
        .eq("id", orderId)
        .single();

      if (ord && ord.payment_status !== "paid") {
        await sb
          .from("orders")
          .update({
            payment_status: "paid",
            payment_method: "sono",
            payment_intent_id: intent.id,
            status: "confirmed",
          })
          .eq("id", orderId);
        console.log("Sono webhook: order confirmed:", orderId);
      } else {
        console.log("Sono webhook: order already paid, skipping:", orderId);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (e: any) {
    console.error("Sono webhook error:", e);
    return new Response("Internal error", { status: 500 });
  }
});
