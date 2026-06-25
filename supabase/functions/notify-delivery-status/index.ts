import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DELIVERY_STATUS_URL = "https://vvqbrpuiqzksygpcmrmg.supabase.co/functions/v1/status-update-inbound";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, payment_status, fulfillment_status, note } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payment_status && !fulfillment_status) {
      return new Response(JSON.stringify({ error: "Must provide payment_status or fulfillment_status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_ref, delivery_order_id")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalOrderId = `EASY-${order.order_ref || order.id}`;

    const apiKey = Deno.env.get("DELIVERY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "DELIVERY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: any = { external_order_id: externalOrderId };
    // Send both references so every API-connected delivery system can locate the same order,
    // whether it keys by EasyShop external_order_id or by its own internal delivery number.
    if (order.delivery_order_id) {
      payload.delivery_order_id = order.delivery_order_id;
      payload.internal_order_number = order.delivery_order_id;
    }
    if (payment_status) payload.payment_status = payment_status;
    if (fulfillment_status) payload.fulfillment_status = fulfillment_status;
    if (note) payload.note = note;

    const res = await fetch(DELIVERY_STATUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    console.log("Notify delivery status response:", JSON.stringify(result));

    return new Response(JSON.stringify({ success: res.ok, detail: result }), {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-delivery-status error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
