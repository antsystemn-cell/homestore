import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OMNIWAY_BASE = (Deno.env.get("OMNIWAY_BASE_URL") || "https://payment.omnitech.mn").replace(/\/$/, "");
const STATUS_PAID = 302;
const STATUS_CANCELLED = 303;

function omniHeaders() {
  const user = Deno.env.get("OMNIWAY_USERNAME");
  const pass = Deno.env.get("OMNIWAY_PASSWORD");
  return {
    Authorization: "Basic " + btoa(`${user}:${pass}`),
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    let payload: any = {};
    try {
      const text = await req.text();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = Object.fromEntries(new URLSearchParams(text));
        }
      }
    } catch {
      /* empty */
    }

    const qp = Object.fromEntries(url.searchParams);
    console.log("OmniWay webhook:", req.method, JSON.stringify({ qp, payload }));

    const orderId = qp.order_id || payload.orderId || null;
    const invoiceNumber =
      payload.invoiceNumber || payload.invoice_number || qp.invoiceNumber || qp.invoice_number || null;

    // Locate the payment intent (by invoice number first, then by order)
    let intent: any = null;
    if (invoiceNumber) {
      const { data } = await sb
        .from("payment_intents")
        .select("*")
        .eq("provider", "OMNIWAY")
        .contains("storepay_response", { invoice_number: invoiceNumber })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      intent = data;
    }
    if (!intent && orderId) {
      const { data } = await sb
        .from("payment_intents")
        .select("*")
        .eq("provider", "OMNIWAY")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      intent = data;
    }

    if (!intent) {
      console.error("OmniWay webhook: intent not found");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = (intent.storepay_response || {}) as any;
    const invNo = meta.invoice_number || invoiceNumber;

    // Never trust the callback body — always verify against OmniWay
    let statusId: number | null = null;
    let checkData: any = null;
    try {
      const res = await fetch(`${OMNIWAY_BASE}/ecommerce/invoices/${invNo}`, { headers: omniHeaders() });
      checkData = await res.json();
      statusId = checkData?.statusId ?? null;
    } catch (e) {
      console.error("OmniWay webhook verify failed:", e);
    }

    if (statusId === STATUS_PAID && intent.status !== "PAID") {
      await sb
        .from("payment_intents")
        .update({ status: "PAID", storepay_response: { ...meta, callback: payload, last_check: checkData } })
        .eq("id", intent.id);

      if (intent.order_id) {
        const { data: ord } = await sb
          .from("orders")
          .select("payment_status")
          .eq("id", intent.order_id)
          .single();
        if (ord && ord.payment_status !== "paid") {
          await sb
            .from("orders")
            .update({
              payment_status: "paid",
              payment_method: "omniway",
              payment_intent_id: intent.id,
              status: "confirmed",
            })
            .eq("id", intent.order_id);
        }
      }
    } else if (statusId === STATUS_CANCELLED && intent.status !== "PAID") {
      await sb
        .from("payment_intents")
        .update({ status: "FAILED", storepay_response: { ...meta, callback: payload, last_check: checkData } })
        .eq("id", intent.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("OmniWay webhook error:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
