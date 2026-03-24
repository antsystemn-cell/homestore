import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STOREPAY_BASE = "https://service.storepay.mn:8778/lend-merchant";
const STOREPAY_AUTH_URL =
  "https://service.storepay.mn:8778/merchant-uaa/oauth/token";

async function getStorepayToken(): Promise<string> {
  const username = Deno.env.get("STOREPAY_USERNAME")!;
  const password = Deno.env.get("STOREPAY_PASSWORD")!;
  const appUsername = Deno.env.get("STOREPAY_APP_USERNAME")!;
  const appPassword = Deno.env.get("STOREPAY_APP_PASSWORD")!;
  const basicAuth = btoa(`${appUsername}:${appPassword}`);

  const res = await fetch(
    `${STOREPAY_AUTH_URL}?grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!res.ok) throw new Error("Storepay auth failed");
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const loanId = url.searchParams.get("id");

    if (!loanId) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Storepay API
    const token = await getStorepayToken();
    const checkRes = await fetch(
      `${STOREPAY_BASE}/merchant/loan/check/${loanId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!checkRes.ok) {
      const text = await checkRes.text();
      return new Response(
        JSON.stringify({ error: "Verification failed", detail: text }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await checkRes.json();
    const isConfirmed =
      data.status === "success" ||
      data.isConfirmed === true ||
      data.confirmed === true;

    if (!isConfirmed) {
      return new Response(JSON.stringify({ status: "not_confirmed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find and update payment intent
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: intent } = await supabase
      .from("payment_intents")
      .select("*")
      .eq("loan_id", String(loanId))
      .single();

    if (intent && intent.status !== "PAID") {
      await supabase
        .from("payment_intents")
        .update({ status: "PAID", storepay_response: data })
        .eq("id", intent.id);

      if (intent.order_id) {
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            payment_method: "storepay",
            payment_intent_id: intent.id,
            status: "confirmed",
          })
          .eq("id", intent.order_id);
      }
    }

    return new Response(JSON.stringify({ status: "confirmed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
