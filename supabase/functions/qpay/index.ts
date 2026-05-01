import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QPAY_BASE = "https://merchant.qpay.mn/v2";

// --- helpers ---

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

// --- QPay Auth with caching ---
// Token is cached in-memory per isolate. On 401, we refresh.

let cachedToken: { access_token: string; refresh_token: string; expires_at: number } | null = null;

async function getQPayToken(): Promise<string> {
  // If cached and not expired (with 60s buffer), return it
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  // Try refresh if we have a refresh token
  if (cachedToken?.refresh_token) {
    try {
      const refreshed = await refreshQPayToken(cachedToken.refresh_token);
      return refreshed;
    } catch (e) {
      console.log("QPay refresh failed, getting new token:", e);
    }
  }

  // Get fresh token
  const username = Deno.env.get("QPAY_USERNAME");
  const password = Deno.env.get("QPAY_PASSWORD");
  if (!username || !password) throw new Error("QPay credentials not configured");

  const basicAuth = btoa(`${username}:${password}`);

  const res = await fetch(`${QPAY_BASE}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QPay auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 7200) * 1000,
  };

  return data.access_token;
}

async function refreshQPayToken(refreshToken: string): Promise<string> {
  const res = await fetch(`${QPAY_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    cachedToken = null;
    throw new Error(`QPay refresh failed (${res.status})`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 7200) * 1000,
  };

  return data.access_token;
}

// Wrapper that retries on 401
async function qpayFetch(url: string, options: RequestInit): Promise<Response> {
  let token = await getQPayToken();
  const headers = { ...options.headers as Record<string, string>, Authorization: `Bearer ${token}` };

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Force re-auth
    cachedToken = null;
    token = await getQPayToken();
    headers.Authorization = `Bearer ${token}`;
    res = await fetch(url, { ...options, headers });
  }

  return res;
}

// --- Route Handlers ---

async function handleCreateInvoice(body: any, req: Request) {
  const userId = await getUserId(req);
  const { orderId } = body;

  if (!orderId) return err("orderId шаардлагатай");

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch order and validate
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

  // Check for existing active invoice
  const { data: existingIntents } = await supabaseAdmin
    .from("payment_intents")
    .select("id, status, storepay_response")
    .eq("order_id", orderId)
    .eq("provider", "QPAY")
    .in("status", ["INITIATED", "WAITING"])
    .limit(1);

  if (existingIntents && existingIntents.length > 0) {
    // Return existing invoice data if still valid
    const existing = existingIntents[0];
    const invoiceData = existing.storepay_response as any;
    if (invoiceData?.invoice_id) {
      return json({
        intentId: existing.id,
        invoiceId: invoiceData.invoice_id,
        qrImage: invoiceData.qr_image,
        qrText: invoiceData.qr_text,
        urls: invoiceData.urls,
        amount: order.total,
      });
    }
  }

  const invoiceCode = Deno.env.get("QPAY_INVOICE_CODE");
  if (!invoiceCode) return err("QPay invoice code тохируулаагүй", 500);

  const senderInvoiceNo = order.order_ref || orderId;
  const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/qpay-webhook?order_id=${orderId}`;

  const invoicePayload = {
    invoice_code: invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: "terminal",
    invoice_description: `EasyShop захиалга ${senderInvoiceNo}`,
    amount: order.total,
    callback_url: callbackUrl,
  };

  console.log("QPay create invoice payload:", JSON.stringify(invoicePayload));

  const res = await qpayFetch(`${QPAY_BASE}/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoicePayload),
  });

  const responseText = await res.text();
  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    console.error("QPay invoice response not JSON:", responseText);
    return err("QPay хариу буруу формат", 502);
  }

  console.log("QPay invoice response status:", res.status);

  if (!res.ok) {
    console.error("QPay invoice error:", JSON.stringify(responseData));
    return err(responseData?.message || "QPay нэхэмжлэл үүсгэхэд алдаа", 502);
  }

  // Store in payment_intents
  const requestId = crypto.randomUUID();
  const intentData: any = {
    order_id: orderId,
    type: "ORDER",
    phone: order.phone || "",
    amount: order.total,
    request_id: requestId,
    provider: "QPAY",
    status: "WAITING",
    storepay_response: {
      invoice_id: responseData.invoice_id,
      qr_image: responseData.qr_image,
      qr_text: responseData.qr_text,
      urls: responseData.urls,
    },
  };
  if (userId) intentData.user_id = userId;

  const { data: intent, error: intentError } = await supabaseAdmin
    .from("payment_intents")
    .insert(intentData)
    .select("id")
    .single();

  if (intentError) {
    console.error("Payment intent insert error:", intentError);
    return err("Төлбөрийн бүртгэл үүсгэхэд алдаа", 500);
  }

  // Update order status
  await supabaseAdmin
    .from("orders")
    .update({ payment_status: "processing", payment_method: "qpay" })
    .eq("id", orderId);

  return json({
    intentId: intent.id,
    invoiceId: responseData.invoice_id,
    qrImage: responseData.qr_image,
    qrText: responseData.qr_text,
    urls: responseData.urls,
    amount: order.total,
  });
}

// Захиалгын статусыг өөрчлөхгүй, зөвхөн QPay QR-г үүсгэж буцаана (хэвлэхэд зориулсан)
async function handlePrintInvoice(body: any, req: Request) {
  const userId = await getUserId(req);
  const { orderId } = body;
  if (!orderId) return err("orderId шаардлагатай");

  const supabaseAdmin = getSupabaseAdmin();
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, order_ref, total, payment_status, user_id, phone")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return err("Захиалга олдсонгүй", 404);

  if (order.payment_status === "paid" || order.payment_status === "confirmed") {
    return err("Энэ захиалга аль хэдийн төлөгдсөн");
  }

  // Хэрэв ижил захиалгад QPay invoice байгаа бол ашиглана
  const { data: existingIntents } = await supabaseAdmin
    .from("payment_intents")
    .select("id, status, storepay_response")
    .eq("order_id", orderId)
    .eq("provider", "QPAY")
    .in("status", ["INITIATED", "WAITING"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingIntents && existingIntents.length > 0) {
    const invoiceData = existingIntents[0].storepay_response as any;
    if (invoiceData?.qr_image) {
      return json({
        invoiceId: invoiceData.invoice_id,
        qrImage: invoiceData.qr_image,
        qrText: invoiceData.qr_text,
        amount: order.total,
      });
    }
  }

  const invoiceCode = Deno.env.get("QPAY_INVOICE_CODE");
  if (!invoiceCode) return err("QPay invoice code тохируулаагүй", 500);

  const senderInvoiceNo = order.order_ref || orderId;
  const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/qpay-webhook?order_id=${orderId}`;

  const invoicePayload = {
    invoice_code: invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: "terminal",
    invoice_description: `EasyShop захиалга ${senderInvoiceNo}`,
    amount: order.total,
    callback_url: callbackUrl,
  };

  const res = await qpayFetch(`${QPAY_BASE}/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoicePayload),
  });

  const responseText = await res.text();
  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    return err("QPay хариу буруу формат", 502);
  }
  if (!res.ok) {
    console.error("QPay print-invoice error:", responseData);
    return err(responseData?.message || "QPay нэхэмжлэл үүсгэхэд алдаа", 502);
  }

  // Хэвлэх invoice-уудыг бүртгэлд хадгалъя — webhook callback ажиллахын тулд
  const requestId = crypto.randomUUID();
  const intentData: any = {
    order_id: orderId,
    type: "ORDER",
    phone: order.phone || "",
    amount: order.total,
    request_id: requestId,
    provider: "QPAY",
    status: "WAITING",
    storepay_response: {
      invoice_id: responseData.invoice_id,
      qr_image: responseData.qr_image,
      qr_text: responseData.qr_text,
      urls: responseData.urls,
      print_only: true,
    },
  };
  if (userId) intentData.user_id = userId;
  await supabaseAdmin.from("payment_intents").insert(intentData);
  // Захиалгын статусыг ӨӨРЧИЛДӨГГҮЙ — энэ нь зөвхөн хэвлэхэд зориулсан

  return json({
    invoiceId: responseData.invoice_id,
    qrImage: responseData.qr_image,
    qrText: responseData.qr_text,
    amount: order.total,
  });
}

async function handleCheckPayment(body: any, req: Request) {
  const userId = await getUserId(req);
  const { intentId } = body;

  if (!intentId) return err("intentId шаардлагатай");

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch intent
  let query = supabaseAdmin
    .from("payment_intents")
    .select("*")
    .eq("id", intentId)
    .eq("provider", "QPAY");

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
  if (!invoiceId) return json({ status: "WAITING", intentId: intent.id });

  // Check with QPay API
  const res = await qpayFetch(`${QPAY_BASE}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("QPay check error:", text);
    return json({ status: "WAITING", intentId: intent.id });
  }

  const checkData = await res.json();
  console.log("QPay payment check:", JSON.stringify(checkData));

  // QPay returns { count: N, paid_amount: X, rows: [...] }
  // If count > 0 and rows exist, payment is made
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

    if (intent.order_id) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "qpay",
          payment_intent_id: intent.id,
          status: "confirmed",
        })
        .eq("id", intent.order_id);
    }

    return json({ status: "PAID", intentId: intent.id });
  }

  return json({ status: "WAITING", intentId: intent.id });
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
      case "print-invoice":
        return await handlePrintInvoice(body, req);
      default:
        return err("Unknown action. Use: create-invoice, check-payment, print-invoice");
    }
  } catch (e: any) {
    console.error("QPay edge function error:", e);
    return err(e.message || "Серверийн алдаа", 500);
  }
});
