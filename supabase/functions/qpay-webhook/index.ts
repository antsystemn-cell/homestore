import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const QPAY_BASE = "https://merchant.qpay.mn/v2";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

let cachedToken: { access_token: string; refresh_token: string; expires_at: number } | null = null;

async function getQPayToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const username = Deno.env.get("QPAY_USERNAME");
  const password = Deno.env.get("QPAY_PASSWORD");
  if (!username || !password) throw new Error("QPay credentials not configured");

  const res = await fetch(`${QPAY_BASE}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`QPay auth failed (${res.status})`);

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 7200) * 1000,
  };
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id");

    console.log("QPay webhook received. order_id:", orderId);

    if (!orderId) {
      return new Response("Missing order_id", { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find the payment intent for this order
    const { data: intent } = await supabaseAdmin
      .from("payment_intents")
      .select("*")
      .eq("order_id", orderId)
      .eq("provider", "QPAY")
      .eq("status", "WAITING")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!intent) {
      console.log("No waiting QPay intent found for order:", orderId);
      return new Response("OK", { status: 200 });
    }

    const invoiceData = intent.storepay_response as any;
    const invoiceId = invoiceData?.invoice_id;

    if (!invoiceId) {
      console.log("No invoice_id in intent:", intent.id);
      return new Response("OK", { status: 200 });
    }

    // Verify payment with QPay API - NEVER trust callback alone
    const token = await getQPayToken();
    const checkRes = await fetch(`${QPAY_BASE}/payment/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        object_type: "INVOICE",
        object_id: invoiceId,
        offset: { page_number: 1, page_limit: 100 },
      }),
    });

    if (!checkRes.ok) {
      console.error("QPay check failed in webhook:", await checkRes.text());
      return new Response("OK", { status: 200 });
    }

    const checkData = await checkRes.json();
    console.log("QPay webhook check result:", JSON.stringify(checkData));

    const paidCount = checkData.count || 0;
    const rows = checkData.rows || [];

    if (paidCount > 0 && rows.length > 0) {
      // Payment confirmed
      await supabaseAdmin
        .from("payment_intents")
        .update({
          status: "PAID",
          storepay_response: { ...invoiceData, payment_check: checkData },
        })
        .eq("id", intent.id);

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "qpay",
          payment_intent_id: intent.id,
          status: "confirmed",
        })
        .eq("id", orderId);

      console.log("QPay webhook: Order confirmed:", orderId);
    }

    return new Response("OK", { status: 200 });
  } catch (e: any) {
    console.error("QPay webhook error:", e);
    return new Response("Internal error", { status: 500 });
  }
});
