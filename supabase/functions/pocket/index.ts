import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Pocket API Config ---
const POCKET_SCHEMA = "https";
const POCKET_OAUTH_HOST = "sso.invescore.mn";
const POCKET_MERCHANT_HOST = "service.invescore.mn/merchant";
const POCKET_REALM = "invescore";

const TOKEN_URL = `${POCKET_SCHEMA}://${POCKET_OAUTH_HOST}/auth/realms/${POCKET_REALM}/protocol/openid-connect/token`;
const INVOICE_URL = `${POCKET_SCHEMA}://${POCKET_MERCHANT_HOST}/v2/invoicing/generate-invoice`;
const INVOICE_CHECK_BY_ORDER_URL = `${POCKET_SCHEMA}://${POCKET_MERCHANT_HOST}/v2/invoicing/invoices/order-number`;
const INVOICE_CHECK_BY_ID_URL = `${POCKET_SCHEMA}://${POCKET_MERCHANT_HOST}/v2/invoicing/invoices/invoice-id`;

// --- Helpers ---
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

// --- Token Cache ---
let cachedToken: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null = null;

async function getPocketToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  // Try refresh first
  if (cachedToken?.refresh_token) {
    try {
      return await refreshPocketToken(cachedToken.refresh_token);
    } catch (e) {
      console.log("Pocket token refresh failed, getting new token:", e);
    }
  }

  // Get fresh token via client_credentials
  const clientId = Deno.env.get("POCKET_CLIENT_ID");
  const clientSecret = Deno.env.get("POCKET_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Pocket credentials not configured");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  console.log("Pocket: Requesting new token...");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pocket auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    expires_at: Date.now() + (data.expires_in || 600) * 1000,
  };

  console.log("Pocket: Token obtained, expires_in:", data.expires_in);
  return data.access_token;
}

async function refreshPocketToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get("POCKET_CLIENT_ID")!;
  const clientSecret = Deno.env.get("POCKET_CLIENT_SECRET")!;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    cachedToken = null;
    throw new Error(`Pocket token refresh failed (${res.status})`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + (data.expires_in || 600) * 1000,
  };

  return data.access_token;
}

// Fetch wrapper with auto-retry on 401
async function pocketFetch(url: string, options: RequestInit): Promise<Response> {
  let token = await getPocketToken();
  const headers = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    console.log("Pocket: Got 401, refreshing token...");
    cachedToken = null;
    token = await getPocketToken();
    headers.Authorization = `Bearer ${token}`;
    res = await fetch(url, { ...options, headers });
  }

  return res;
}

// --- Route: Create Invoice ---
async function handleCreateInvoice(body: any, req: Request) {
  const userId = await getUserId(req);
  const { orderId } = body;

  if (!orderId) return err("orderId шаардлагатай");

  const terminalId = Deno.env.get("POCKET_TERMINAL_ID");
  if (!terminalId) return err("Pocket terminal ID тохируулаагүй", 500);

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return err("Захиалга олдсонгүй", 404);

  // Validate ownership
  if (order.user_id && userId && order.user_id !== userId) {
    return err("Зөвшөөрөлгүй", 403);
  }

  // Prevent double payment
  if (order.payment_status === "paid") {
    return err("Энэ захиалга аль хэдийн төлөгдсөн");
  }

  // Check for existing active intent
  const { data: existingIntents } = await supabaseAdmin
    .from("payment_intents")
    .select("id, status, storepay_response")
    .eq("order_id", orderId)
    .eq("provider", "POCKET")
    .in("status", ["INITIATED", "WAITING"])
    .limit(1);

  if (existingIntents && existingIntents.length > 0) {
    const existing = existingIntents[0];
    const invoiceData = existing.storepay_response as any;
    if (invoiceData?.invoice_id) {
      return json({
        intentId: existing.id,
        invoiceId: invoiceData.invoice_id,
        qr: invoiceData.qr,
        deeplink: invoiceData.deeplink,
        orderNumber: invoiceData.orderNumber,
        amount: order.total,
      });
    }
  }

  // Create Pocket invoice
  const orderNumber = order.order_ref || orderId;
  const invoicePayload = {
    terminalId: Number(terminalId),
    amount: order.total,
    info: `ORDER-${orderNumber}`,
    orderNumber: orderNumber,
    invoiceType: "ZERO",
    channel: "ecommerce",
  };

  console.log("Pocket: Creating invoice:", JSON.stringify(invoicePayload));

  const res = await pocketFetch(INVOICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoicePayload),
  });

  const responseText = await res.text();
  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    console.error("Pocket invoice response not JSON:", responseText);
    return err("Pocket хариу буруу формат", 502);
  }

  console.log("Pocket invoice response:", res.status, JSON.stringify(responseData));

  if (!res.ok) {
    return err(responseData?.message || "Pocket нэхэмжлэл үүсгэхэд алдаа", 502);
  }

  // Store payment intent
  const requestId = crypto.randomUUID();
  const intentData: any = {
    order_id: orderId,
    type: "ORDER",
    phone: order.phone || "",
    amount: order.total,
    request_id: requestId,
    provider: "POCKET",
    status: "WAITING",
    storepay_response: {
      invoice_id: responseData.id,
      qr: responseData.qr,
      deeplink: responseData.deeplink,
      orderNumber: responseData.orderNumber,
    },
  };
  if (userId) intentData.user_id = userId;

  const { data: intent, error: intentError } = await supabaseAdmin
    .from("payment_intents")
    .insert(intentData)
    .select("id")
    .single();

  if (intentError) {
    console.error("Pocket intent insert error:", intentError);
    return err("Төлбөрийн бүртгэл үүсгэхэд алдаа", 500);
  }

  // Update order
  await supabaseAdmin
    .from("orders")
    .update({ payment_status: "processing", payment_method: "pocket" })
    .eq("id", orderId);

  return json({
    intentId: intent.id,
    invoiceId: responseData.id,
    qr: responseData.qr,
    deeplink: responseData.deeplink,
    orderNumber: responseData.orderNumber,
    amount: order.total,
  });
}

// --- Route: Check Payment ---
async function handleCheckPayment(body: any, req: Request) {
  const userId = await getUserId(req);
  const { intentId } = body;

  if (!intentId) return err("intentId шаардлагатай");

  const terminalId = Deno.env.get("POCKET_TERMINAL_ID");
  if (!terminalId) return err("Pocket terminal ID тохируулаагүй", 500);

  const supabaseAdmin = getSupabaseAdmin();

  let query = supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("id", intentId)
    .eq("provider", "POCKET");

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.is("user_id", null);
  }

  const { data: intent } = await query.single();
  if (!intent) return err("Төлбөрийн мэдээлэл олдсонгүй", 404);

  // Already resolved
  if (intent.status === "PAID") return json({ status: "PAID", intentId: intent.id });
  if (intent.status === "FAILED") return json({ status: "FAILED", intentId: intent.id });

  const invoiceData = intent.storepay_response as any;
  const invoiceId = invoiceData?.invoice_id;
  const orderNumber = invoiceData?.orderNumber;

  if (!invoiceId && !orderNumber) return json({ status: "WAITING", intentId: intent.id });

  // Check invoice status via order number
  const checkPayload = {
    terminalId: Number(terminalId),
    orderNumber: orderNumber,
  };

  const res = await pocketFetch(INVOICE_CHECK_BY_ORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkPayload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Pocket check error:", text);
    return json({ status: "WAITING", intentId: intent.id });
  }

  const checkData = await res.json();
  console.log("Pocket payment check:", JSON.stringify(checkData));

  // state: "paid" means payment confirmed
  if (checkData.state === "paid") {
    await supabaseAdmin
      .from("payment_intents")
      .update({
        status: "PAID",
        storepay_response: { ...invoiceData, payment_check: checkData },
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

    return json({ status: "PAID", intentId: intent.id });
  }

  // Check for failed/cancelled states
  if (["cancelled", "rejected", "unsuccess"].includes(checkData.state)) {
    await supabaseAdmin
      .from("payment_intents")
      .update({
        status: "FAILED",
        storepay_response: { ...invoiceData, payment_check: checkData },
      })
      .eq("id", intent.id);

    return json({ status: "FAILED", intentId: intent.id, state: checkData.state });
  }

  // Still pending/processing/processed
  return json({ status: "WAITING", intentId: intent.id, state: checkData.state });
}

// --- Route: Configure Webhook ---
async function handleConfigureWebhook() {
  const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/pocket-webhook`;
  const configUrl = `${POCKET_SCHEMA}://${POCKET_MERCHANT_HOST}/pg/config`;

  const res = await pocketFetch(configUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fallBackUrl: webhookUrl }),
  });

  const data = await res.json();
  console.log("Pocket webhook config response:", JSON.stringify(data));

  if (!res.ok) {
    return err("Webhook тохиргоо хийхэд алдаа", 502);
  }

  return json({ success: true, webhookUrl, response: data });
}

// --- Main Handler ---
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const action = body.action || new URL(req.url).searchParams.get("action");

    switch (action) {
      case "create-invoice":
        return await handleCreateInvoice(body, req);
      case "check-payment":
        return await handleCheckPayment(body, req);
      case "configure-webhook":
        return await handleConfigureWebhook();
      default:
        return err("Unknown action. Use: create-invoice, check-payment, configure-webhook");
    }
  } catch (e: any) {
    console.error("Pocket edge function error:", e);
    return err(e.message || "Серверийн алдаа", 500);
  }
});
