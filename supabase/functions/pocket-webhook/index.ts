import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Pocket Payment Gateway Webhook
 *
 * Receives payment status updates from Pocket.
 * Webhook payload format:
 * {
 *   "id": transaction_id,
 *   "amount": amount,
 *   "info": "info string",
 *   "invoiceId": invoice_id,
 *   "invoiceState": 10|20|30|40|50|60|70,
 *   "heldId": held_id,
 *   "phoneNumber": "phone",
 *   "orderNumber": "order_number"
 * }
 *
 * invoiceState values:
 *   10 = pending
 *   20 = paid
 *   30 = cancelled
 *   40 = rejected
 *   50 = unsuccess
 *   60 = processing
 *   70 = processed (zero loan created, awaiting confirmation)
 */

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      // Try URL params as fallback
      const url = new URL(req.url);
      payload = Object.fromEntries(url.searchParams.entries());
    }

    console.log("Pocket webhook received:", JSON.stringify(payload));

    const {
      invoiceId,
      invoiceState,
      orderNumber,
      amount,
      phoneNumber,
      id: transactionId,
    } = payload;

    if (!invoiceId && !orderNumber) {
      console.log("Pocket webhook: No invoiceId or orderNumber");
      return new Response("OK", { status: 200 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find payment intent by invoice_id stored in storepay_response
    let intent: any = null;

    if (orderNumber) {
      // Try by orderNumber first (most reliable)
      const { data: intents } = await supabaseAdmin
        .from("payment_intents")
        .select("*")
        .eq("provider", "POCKET")
        .in("status", ["INITIATED", "WAITING"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (intents) {
        intent = intents.find((i: any) => {
          const resp = i.storepay_response as any;
          return resp?.orderNumber === orderNumber || resp?.invoice_id === invoiceId;
        });
      }
    }

    if (!intent) {
      console.log("Pocket webhook: No matching intent found for orderNumber:", orderNumber, "invoiceId:", invoiceId);
      return new Response("OK", { status: 200 });
    }

    const invoiceData = intent.storepay_response as any;

    // Map invoiceState to our status
    // 20 = paid (SUCCESS)
    // 30 = cancelled, 40 = rejected, 50 = unsuccess (FAILED)
    // 70 = processed (zero loan created, needs confirmation - still WAITING)

    if (invoiceState === 20 || invoiceState === "20" || invoiceState === "paid") {
      // Payment confirmed!
      console.log("Pocket webhook: Payment PAID for order:", intent.order_id);

      await supabaseAdmin
        .from("payment_intents")
        .update({
          status: "PAID",
          storepay_response: {
            ...invoiceData,
            webhook_payload: payload,
          },
        })
        .eq("id", intent.id);

      if (intent.order_id) {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            payment_method: "pocket",
            payment_intent_id: intent.id,
            status: "confirmed",
          })
          .eq("id", intent.order_id);
      }
    } else if (
      [30, 40, 50, "30", "40", "50", "cancelled", "rejected", "unsuccess"].includes(invoiceState)
    ) {
      // Payment failed/cancelled
      console.log("Pocket webhook: Payment FAILED for order:", intent.order_id, "state:", invoiceState);

      await supabaseAdmin
        .from("payment_intents")
        .update({
          status: "FAILED",
          storepay_response: {
            ...invoiceData,
            webhook_payload: payload,
          },
        })
        .eq("id", intent.id);
    } else if (invoiceState === 70 || invoiceState === "70" || invoiceState === "processed") {
      // Zero loan created, awaiting confirmation - keep as WAITING
      console.log("Pocket webhook: Zero loan PROCESSED, awaiting confirmation for order:", intent.order_id);

      await supabaseAdmin
        .from("payment_intents")
        .update({
          storepay_response: {
            ...invoiceData,
            webhook_payload: payload,
            zero_loan_status: "processed",
          },
        })
        .eq("id", intent.id);
    } else {
      console.log("Pocket webhook: Unhandled invoiceState:", invoiceState);
    }

    return new Response("OK", { status: 200 });
  } catch (e: any) {
    console.error("Pocket webhook error:", e);
    return new Response("Internal error", { status: 500 });
  }
});
