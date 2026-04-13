import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DELIVERY_API_URL = "https://vvqbrpuiqzksygpcmrmg.supabase.co/functions/v1/order-intake";

function mapPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "unpaid",
    unpaid: "unpaid",
    processing: "unpaid",
    cod: "cash_on_delivery",
    cash: "cash_on_delivery",
    paid: "paid",
    confirmed: "paid",
    completed: "paid",
    refunded: "refunded",
  };
  return map[status] || "unpaid";
}

function mapPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    qpay: "qpay",
    storepay: "storepay",
    pocket: "pocket",
    cash: "cash_on_delivery",
    bank_transfer: "bank_transfer",
  };
  return map[method] || method;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
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
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already sent?
    if (order.delivery_order_id) {
      return new Response(JSON.stringify({ 
        success: true, 
        delivery_order_id: order.delivery_order_id,
        message: "Already sent" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const externalOrderId = `EASY-${order.order_ref || order.id}`;

    const payload = {
      external_order_id: externalOrderId,
      customer_name: order.guest_name || "Хэрэглэгч",
      phone: order.phone || "",
      address_text: order.shipping_address || undefined,
      payment_method: mapPaymentMethod(order.payment_method || "cash"),
      payment_status: mapPaymentStatus(order.payment_status || "unpaid"),
      delivery_fee: order.delivery_fee || 0,
      subtotal: (order.total || 0) - (order.delivery_fee || 0),
      total_amount: order.total || 0,
      source_channel: "easyshop_web",
      items: items.map((item: any) => ({
        product_name: item.name || "",
        sku: item.product_code || undefined,
        variant: [item.color, item.size].filter(Boolean).join(" / ") || undefined,
        quantity: item.quantity || 1,
        unit_price: item.price || 0,
      })),
    };

    const apiKey = Deno.env.get("DELIVERY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "DELIVERY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(DELIVERY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    console.log("Delivery API response:", JSON.stringify(result));

    if (res.ok && result.internal_order_number) {
      // Save delivery reference
      await supabase
        .from("orders")
        .update({
          delivery_order_id: result.internal_order_number,
          delivery_status: "processing",
        })
        .eq("id", order_id);
    }

    return new Response(JSON.stringify({
      success: res.ok,
      delivery_order_id: result.internal_order_number || null,
      detail: result,
    }), {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-to-delivery error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
