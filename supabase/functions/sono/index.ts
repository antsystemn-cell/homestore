import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SONO_BASE = "https://rico.mn/api/w";
const MIN_AMOUNT = 10000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

function sonoHeaders() {
  const user = Deno.env.get("SONO_AUTH_USER");
  const token = Deno.env.get("SONO_AUTH_TOKEN");
  if (!user || !token) throw new Error("Sono credentials тохируулаагүй");
  return {
    "x-and-auth-user": user,
    "x-and-auth-token": token,
    "Content-Type": "application/json",
  };
}

// Sono invoice_id: max 50 chars, must be unique per shop
function buildInvoiceId(orderRef: string | null, orderId: string): string {
  const base = (orderRef || orderId).replace(/[^A-Za-z0-9]/g, "");
  const suffix = Date.now().toString();
  return (base + suffix).slice(0, 50);
}

async function handleCreateInvoice(body: any, req: Request) {
  const userId = await getUserId(req);
  const { orderId } = body;
  if (!orderId) return err("orderId шаардлагатай");

  const sb = getSupabaseAdmin();

  const { data: order, error: orderErr } = await sb
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return err("Захиалга олдсонгүй", 404);

  if (order.user_id && userId && order.user_id !== userId) {
    return err("Зөвшөөрөлгүй", 403);
  }
  if (order.payment_status === "paid") {
    return err("Энэ захиалга аль хэдийн төлөгдсөн");
  }
  if (!order.total || order.total < MIN_AMOUNT) {
    return err(`Sono-р төлөх боломжтой хамгийн бага дүн ${MIN_AMOUNT.toLocaleString()}₮`);
  }

  // Reuse existing waiting invoice if present
  const { data: existing } = await sb
    .from("payment_intents")
    .select("id, status, storepay_response")
    .eq("order_id", orderId)
    .eq("provider", "SONO")
    .in("status", ["INITIATED", "WAITING"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    const data = existing[0].storepay_response as any;
    if (data?.invoice_id && data?.qr_string) {
      return json({
        intentId: existing[0].id,
        invoiceId: data.invoice_id,
        qrString: data.qr_string,
        amount: order.total,
      });
    }
  }

  const invoiceId = buildInvoiceId(order.order_ref, orderId);
  const branchCode = Deno.env.get("SONO_DEFAULT_BRANCH_CODE") || "";
  const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sono-webhook?order_id=${orderId}&invoice_id=${invoiceId}`;

  const payload: Record<string, any> = {
    amount: Math.round(order.total),
    description: `EasyShop захиалга ${order.order_ref || orderId}`,
    callback_url: callbackUrl,
    invoice_id: invoiceId,
    phoneNumber: order.phone || "",
    duration: "",
    trackingData: branchCode,
  };

  console.log("Sono create invoice payload:", JSON.stringify(payload));

  let res: Response;
  try {
    res = await fetch(`${SONO_BASE}/pos/invoices`, {
      method: "POST",
      headers: sonoHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    console.error("Sono fetch failed:", e);
    return err("Sono сервертэй холбогдоход алдаа гарлаа", 502);
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Sono response not JSON:", text);
    return err("Sono-ийн хариу буруу формат", 502);
  }

  console.log("Sono response:", res.status, JSON.stringify(data));

  if (!res.ok || data?.code !== 0 || !data?.response?.qr_string) {
    const message =
      data?.response?.ErrorMessage ||
      data?.description ||
      "Sono нэхэмжлэл үүсгэхэд алдаа гарлаа";
    return err(message, 502);
  }

  const sonoResp = data.response;

  const intentData: any = {
    order_id: orderId,
    type: "ORDER",
    phone: order.phone || "",
    amount: order.total,
    request_id: crypto.randomUUID(),
    provider: "SONO",
    status: "WAITING",
    storepay_response: {
      invoice_id: invoiceId,
      sono_invoice_number: sonoResp.invoiceNumber,
      qr_string: sonoResp.qr_string,
      raw_create: data,
    },
  };
  if (userId) intentData.user_id = userId;

  const { data: intent, error: intentError } = await sb
    .from("payment_intents")
    .insert(intentData)
    .select("id")
    .single();

  if (intentError) {
    console.error("Sono intent insert error:", intentError);
    return err("Төлбөрийн бүртгэл үүсгэхэд алдаа", 500);
  }

  await sb
    .from("orders")
    .update({ payment_status: "processing", payment_method: "sono" })
    .eq("id", orderId);

  return json({
    intentId: intent.id,
    invoiceId,
    qrString: sonoResp.qr_string,
    amount: order.total,
  });
}

async function handleCheckPayment(body: any, req: Request) {
  const userId = await getUserId(req);
  const { intentId } = body;
  if (!intentId) return err("intentId шаардлагатай");

  const sb = getSupabaseAdmin();

  let query = sb
    .from("payment_intents")
    .select("*")
    .eq("id", intentId)
    .eq("provider", "SONO");
  if (userId) query = query.eq("user_id", userId);
  else query = query.is("user_id", null);

  const { data: intent } = await query.single();
  if (!intent) return err("Төлбөрийн мэдээлэл олдсонгүй", 404);

  if (intent.status === "PAID") return json({ status: "PAID", intentId: intent.id });
  if (intent.status === "FAILED") return json({ status: "FAILED", intentId: intent.id });

  const invoiceData = intent.storepay_response as any;
  const invoiceId = invoiceData?.invoice_id;
  if (!invoiceId) return json({ status: "WAITING", intentId: intent.id });

  let res: Response;
  try {
    res = await fetch(`${SONO_BASE}/invoices/check`, {
      method: "POST",
      headers: sonoHeaders(),
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
  } catch (e) {
    console.error("Sono check fetch failed:", e);
    return json({ status: "WAITING", intentId: intent.id });
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return json({ status: "WAITING", intentId: intent.id });
  }

  console.log("Sono check response:", JSON.stringify(data));

  const status = data?.response?.payment_status;

  // Expired invoice (Sono code 6083)
  if (data?.code === 6083) {
    await sb
      .from("payment_intents")
      .update({
        status: "FAILED",
        storepay_response: { ...invoiceData, last_check: data },
      })
      .eq("id", intent.id);
    return json({ status: "FAILED", intentId: intent.id });
  }

  if (status === "PAID") {
    // Idempotent: only update order if not already paid
    await sb
      .from("payment_intents")
      .update({
        status: "PAID",
        storepay_response: { ...invoiceData, last_check: data },
      })
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
            payment_method: "sono",
            payment_intent_id: intent.id,
            status: "confirmed",
          })
          .eq("id", intent.order_id);
      }
    }
    return json({ status: "PAID", intentId: intent.id });
  }

  return json({ status: "WAITING", intentId: intent.id });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      /* empty */
    }
    const action = body.action || new URL(req.url).searchParams.get("action");
    switch (action) {
      case "create-invoice":
        return await handleCreateInvoice(body, req);
      case "check-payment":
        return await handleCheckPayment(body, req);
      default:
        return err("Unknown action. Use: create-invoice, check-payment");
    }
  } catch (e: any) {
    console.error("Sono edge function error:", e);
    return err(e.message || "Серверийн алдаа", 500);
  }
});
