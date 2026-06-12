import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function mapFulfillmentToEasyshop(status: string): string {
  const s = (status || "").toLowerCase();
  const map: Record<string, string> = {
    confirmed: "confirmed",
    phone_confirmed: "phone_confirmed",
    preparing: "confirmed",
    ready_for_pickup: "confirmed",
    // Driver assigned / dispatched / in transit → "delivering" (Хүргэлтэнд гарсан)
    assigned: "delivering",
    driver_assigned: "delivering",
    dispatched: "delivering",
    picked_up: "delivering",
    in_transit: "delivering",
    on_the_way: "delivering",
    out_for_delivery: "delivering",
    delivering: "delivering",
    delivered: "completed",
    completed: "completed",
    cancelled: "cancelled",
    canceled: "cancelled",
  };
  return map[s] || s;
}

function mapPaymentToEasyshop(status: string): string {
  const map: Record<string, string> = {
    unpaid: "unpaid",
    cash_on_delivery: "unpaid",
    paid: "paid",
    refunded: "refunded",
  };
  return map[status] || status;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const webhookSecret = Deno.env.get("DELIVERY_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("X-Webhook-Secret");

    if (!webhookSecret || providedSecret !== webhookSecret) {
      console.error("Webhook auth failed");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { external_order_id, fulfillment_status, payment_status } = body;

    console.log("Delivery webhook received:", JSON.stringify(body));

    if (!external_order_id) {
      return new Response(JSON.stringify({ error: "Missing external_order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract order ref from EASY-{order_ref}
    const orderRef = external_order_id.replace("EASY-", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find order by order_ref or id
    let order: any = null;
    const { data: byRef } = await supabase
      .from("orders")
      .select("id, status, payment_status")
      .eq("order_ref", orderRef)
      .single();

    if (byRef) {
      order = byRef;
    } else {
      // Try by id
      const { data: byId } = await supabase
        .from("orders")
        .select("id, status, payment_status")
        .eq("id", orderRef)
        .single();
      order = byId;
    }

    if (!order) {
      console.log("Order not found for ref:", orderRef);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: any = {};

    if (fulfillment_status) {
      const mapped = mapFulfillmentToEasyshop(fulfillment_status);
      updates.status = mapped;
      updates.delivery_status = fulfillment_status;
    }

    if (payment_status) {
      const mapped = mapPaymentToEasyshop(payment_status);
      if (mapped === "paid") {
        updates.payment_status = "paid";
      } else {
        updates.payment_status = mapped;
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", order.id);

      if (error) {
        console.error("Failed to update order:", error);
        return new Response(JSON.stringify({ error: "Update failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Order updated:", order.id, updates);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Delivery webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
