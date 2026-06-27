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
    // Driver finished delivery → "completed" (Хүргэлт дууссан)
    delivered: "completed",
    completed: "completed",
    complete: "completed",
    finished: "completed",
    done: "completed",
    success: "completed",
    successful: "completed",
    fulfilled: "completed",
    handed_over: "completed",
    delivery_completed: "completed",
    cancelled: "cancelled",
    canceled: "cancelled",
    failed: "cancelled",
    returned: "cancelled",
  };
  if (map[s]) return map[s];
  // Fallback: any string containing "deliver" + "ed"/"complete"/"done" → completed
  if (/deliver(ed|y[_-]?complete)/i.test(s) || /complete|finish|done|success/i.test(s)) {
    return "completed";
  }
  if (/cancel|fail|return/i.test(s)) return "cancelled";
  if (/transit|dispatch|pickup|picked|on[_-]?the[_-]?way|out[_-]?for/i.test(s)) return "delivering";
  return s;
}

function mapPaymentToEasyshop(status: string): string {
  const map: Record<string, string> = {
    unpaid: "unpaid",
    cash_on_delivery: "unpaid",
    paid: "confirmed",
    confirmed: "confirmed",
    completed: "confirmed",
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
    const providedSecret =
      req.headers.get("X-Webhook-Secret") ||
      req.headers.get("x-webhook-secret") ||
      req.headers.get("x-api-key");

    if (!webhookSecret || providedSecret !== webhookSecret) {
      console.error("Webhook auth failed");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Delivery webhook received:", JSON.stringify(body));

    // Accept multiple field name variants from partner
    const external_order_id =
      body.external_order_id || body.externalOrderId || body.order_ref || body.orderRef || body.ref;
    const fulfillment_status =
      body.fulfillment_status || body.status || body.delivery_status || body.deliveryStatus;
    const payment_status = body.payment_status || body.paymentStatus;
    const delivery_order_id = body.delivery_order_id || body.internal_order_number;

    if (!external_order_id && !delivery_order_id) {
      return new Response(JSON.stringify({ error: "Missing external_order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract order ref from EASY-{order_ref}
    const orderRef = (external_order_id || "").replace(/^EASY-/i, "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find order by order_ref, id, or delivery_order_id
    const ORDER_COLS = "id, status, payment_status, payment_method";
    let order: any = null;
    if (orderRef) {
      const { data: byRef } = await supabase
        .from("orders")
        .select(ORDER_COLS)
        .eq("order_ref", orderRef)
        .maybeSingle();
      if (byRef) order = byRef;

      if (!order) {
        const { data: byId } = await supabase
          .from("orders")
          .select(ORDER_COLS)
          .eq("id", orderRef)
          .maybeSingle();
        if (byId) order = byId;
      }
    }

    if (!order && delivery_order_id) {
      const { data: byDelivery } = await supabase
        .from("orders")
        .select(ORDER_COLS)
        .eq("delivery_order_id", delivery_order_id)
        .maybeSingle();
      if (byDelivery) order = byDelivery;
    }

    if (!order) {
      console.log("Order not found for ref:", orderRef, "delivery_id:", delivery_order_id);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: any = {};

    if (fulfillment_status) {
      const mapped = mapFulfillmentToEasyshop(fulfillment_status);
      updates.status = mapped;
      // Normalize delivery_status so admin UI badges (which check "out_for_delivery"/"delivered") work
      updates.delivery_status =
        mapped === "delivering" ? "out_for_delivery" :
        mapped === "completed"  ? "delivered" :
        fulfillment_status;

      // If the connected delivery system re-opens a cancelled/delivered order,
      // clear EasyShop terminal markers too; otherwise the admin UI can still
      // keep the order under "Хүргэгдсэн" because delivered_at remains set.
      if (mapped !== "completed" && mapped !== "cancelled") {
        updates.delivered_at = null;
        updates.delivery_failed_at = null;
        updates.delivery_return_reason = null;
      }
    }

    if (payment_status) {
      const mapped = mapPaymentToEasyshop(payment_status);
      if (mapped === "paid" || mapped === "confirmed") {
        updates.payment_status = "confirmed";
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
