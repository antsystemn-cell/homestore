import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OMNIWAY_BASE = (Deno.env.get("OMNIWAY_BASE_URL") || "https://payment.omnitech.mn").replace(/\/$/, "");

// Invoice statuses (statusId)
const STATUS_UNPAID = 301;
const STATUS_PAID = 302;
const STATUS_CANCELLED = 303;

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

function omniHeaders() {
  const user = Deno.env.get("OMNIWAY_USERNAME");
  const pass = Deno.env.get("OMNIWAY_PASSWORD");
  if (!user || !pass) throw new Error("OmniWay credentials тохируулаагүй байна");
  return {
    Authorization: "Basic " + btoa(`${user}:${pass}`),
    "Content-Type": "application/json",
  };
}

async function omniFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${OMNIWAY_BASE}${path}`, {
    ...init,
    headers: { ...omniHeaders(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

// Merchant order number: unique per invoice attempt (duplicates rejected with code 1012)
function buildOrderNumber(orderRef: string | null, orderId: string): string {
  const base = (orderRef || orderId).replace(/[^A-Za-z0-9-]/g, "").slice(0, 24);
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

async function markOrderPaid(sb: any, orderId: string, intentId: string) {
  const { data: ord } = await sb
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .single();
  if (ord && ord.payment_status !== "paid") {
    await sb
      .from("orders")
      .update({
        payment_status: "paid",
        payment_method: "omniway",
        payment_intent_id: intentId,
        status: "confirmed",
      })
      .eq("id", orderId);
  }
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
  if (order.user_id && userId && order.user_id !== userId) return err("Зөвшөөрөлгүй", 403);
  if (order.payment_status === "paid") return err("Энэ захиалга аль хэдийн төлөгдсөн");
  if (!order.total || Number(order.total) <= 0) return err("Захиалгын дүн буруу байна");

  // Reuse an existing waiting invoice when it is still unpaid on OmniWay side
  const { data: existing } = await sb
    .from("payment_intents")
    .select("id, status, storepay_response")
    .eq("order_id", orderId)
    .eq("provider", "OMNIWAY")
    .in("status", ["INITIATED", "WAITING"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    const prev = existing[0].storepay_response as any;
    if (prev?.invoice_number && prev?.qr_content) {
      const check = await omniFetch(`/ecommerce/invoices/${prev.invoice_number}`);
      const st = check.data?.statusId;
      if (check.ok && st === STATUS_UNPAID) {
        return json({
          intentId: existing[0].id,
          invoiceNumber: prev.invoice_number,
          qrContent: prev.qr_content,
          imageBase64: prev.image_base64 || "",
          amount: Number(order.total),
        });
      }
      if (check.ok && st === STATUS_PAID) {
        await sb.from("payment_intents").update({ status: "PAID" }).eq("id", existing[0].id);
        await markOrderPaid(sb, orderId, existing[0].id);
        return json({ status: "PAID", intentId: existing[0].id });
      }
      // otherwise fall through and create a fresh invoice
      await sb.from("payment_intents").update({ status: "FAILED" }).eq("id", existing[0].id);
    }
  }

  const orderNumber = buildOrderNumber(order.order_ref, orderId);
  const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/omniway-webhook?order_id=${orderId}`;

  const itemsDesc = Array.isArray(order.items)
    ? (order.items as any[])
        .map((i: any) => `${i?.product?.name || i?.name || ""} x${i?.quantity || 1}`)
        .filter(Boolean)
        .join(", ")
        .slice(0, 250)
    : "";

  const payload: Record<string, unknown> = {
    amount: Math.round(Number(order.total)),
    orderNumber,
    mobileNumber: (order.phone || "").toString().replace(/\D/g, "").slice(-8),
    email: order.email || "",
    shippingAddress: (order.shipping_address || "").slice(0, 250),
    description: itemsDesc || `EasyShop захиалга ${order.order_ref || orderId}`,
    callbackUrl,
  };

  console.log("OmniWay create invoice:", JSON.stringify({ ...payload, callbackUrl }));

  let res;
  try {
    res = await omniFetch("/ecommerce/invoices", { method: "POST", body: JSON.stringify(payload) });
  } catch (e) {
    console.error("OmniWay fetch failed:", e);
    return err("OmniWay сервертэй холбогдоход алдаа гарлаа", 502);
  }

  console.log("OmniWay create response:", res.status, JSON.stringify(res.data)?.slice(0, 300));

  if (!res.ok || !res.data?.invoiceNumber) {
    const code = res.data?.code;
    const map: Record<number, string> = {
      1001: "Нэхэмжлэхийн дүн хоосон байна",
      1011: "Нэхэмжлэхийн дүн болон захиалгын дугаар буруу байна",
      1012: "Захиалгын дугаар давхардсан байна",
    };
    if (res.status === 401 || res.status === 403) {
      return err("OmniWay холболтын эрх хүчингүй байна. Нэвтрэх мэдээллээ шалгана уу.", 502);
    }
    return err(map[code] || res.data?.message || "OmniWay нэхэмжлэх үүсгэхэд алдаа гарлаа", 502);
  }

  const inv = res.data;

  const intentData: any = {
    order_id: orderId,
    type: "ORDER",
    phone: order.phone || "",
    amount: Number(order.total),
    request_id: crypto.randomUUID(),
    provider: "OMNIWAY",
    status: "WAITING",
    storepay_response: {
      invoice_number: inv.invoiceNumber,
      order_number: orderNumber,
      qr_content: inv.qrContent,
      image_base64: inv.imageBase64,
    },
  };
  if (userId) intentData.user_id = userId;

  const { data: intent, error: intentError } = await sb
    .from("payment_intents")
    .insert(intentData)
    .select("id")
    .single();

  if (intentError) {
    console.error("OmniWay intent insert error:", intentError);
    return err("Төлбөрийн бүртгэл үүсгэхэд алдаа", 500);
  }

  await sb
    .from("orders")
    .update({ payment_status: "processing", payment_method: "omniway" })
    .eq("id", orderId);

  return json({
    intentId: intent.id,
    invoiceNumber: inv.invoiceNumber,
    qrContent: inv.qrContent,
    imageBase64: inv.imageBase64,
    amount: Number(order.total),
  });
}

async function handleCheckPayment(body: any, req: Request) {
  const userId = await getUserId(req);
  const { intentId } = body;
  if (!intentId) return err("intentId шаардлагатай");

  const sb = getSupabaseAdmin();

  let query = sb.from("payment_intents").select("*").eq("id", intentId).eq("provider", "OMNIWAY");
  if (userId) query = query.eq("user_id", userId);
  else query = query.is("user_id", null);

  const { data: intent } = await query.maybeSingle();
  if (!intent) return err("Төлбөрийн мэдээлэл олдсонгүй", 404);

  if (intent.status === "PAID") return json({ status: "PAID", intentId: intent.id });
  if (intent.status === "FAILED") return json({ status: "FAILED", intentId: intent.id });

  const meta = (intent.storepay_response || {}) as any;
  const invoiceNumber = meta.invoice_number;
  if (!invoiceNumber) return json({ status: "WAITING", intentId: intent.id });

  let res;
  try {
    res = await omniFetch(`/ecommerce/invoices/${invoiceNumber}`);
  } catch (e) {
    console.error("OmniWay check failed:", e);
    return json({ status: "WAITING", intentId: intent.id });
  }

  const statusId = res.data?.statusId;
  console.log("OmniWay check:", invoiceNumber, res.status, JSON.stringify(res.data));

  if (statusId === STATUS_PAID) {
    await sb
      .from("payment_intents")
      .update({ status: "PAID", storepay_response: { ...meta, last_check: res.data } })
      .eq("id", intent.id);
    if (intent.order_id) await markOrderPaid(sb, intent.order_id, intent.id);
    return json({ status: "PAID", intentId: intent.id });
  }

  if (statusId === STATUS_CANCELLED) {
    await sb
      .from("payment_intents")
      .update({ status: "FAILED", storepay_response: { ...meta, last_check: res.data } })
      .eq("id", intent.id);
    return json({ status: "FAILED", intentId: intent.id });
  }

  return json({ status: "WAITING", intentId: intent.id });
}

async function handleCancelInvoice(body: any, req: Request) {
  const userId = await getUserId(req);
  const { intentId } = body;
  if (!intentId) return err("intentId шаардлагатай");

  const sb = getSupabaseAdmin();
  let query = sb.from("payment_intents").select("*").eq("id", intentId).eq("provider", "OMNIWAY");
  if (userId) query = query.eq("user_id", userId);
  else query = query.is("user_id", null);

  const { data: intent } = await query.maybeSingle();
  if (!intent) return err("Төлбөрийн мэдээлэл олдсонгүй", 404);
  if (intent.status === "PAID") return err("Төлөгдсөн нэхэмжлэхийг цуцлах боломжгүй");

  const meta = (intent.storepay_response || {}) as any;
  if (meta.invoice_number) {
    try {
      await omniFetch(`/ecommerce/invoices/${meta.invoice_number}/cancel`, { method: "POST" });
    } catch (e) {
      console.error("OmniWay cancel failed:", e);
    }
  }

  await sb.from("payment_intents").update({ status: "FAILED" }).eq("id", intent.id);
  return json({ status: "CANCELLED", intentId: intent.id });
}

// Admin-side lifecycle helpers -------------------------------------------------
async function requireAdmin(req: Request): Promise<boolean> {
  const userId = await getUserId(req);
  if (!userId) return false;
  const sb = getSupabaseAdmin();
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  return !!data?.some((r: any) => r.role === "admin" || r.role === "moderator");
}

async function handleOrderDelivered(body: any, req: Request) {
  if (!(await requireAdmin(req))) return err("Зөвшөөрөлгүй", 403);
  const { orderId, orderAmount } = body;
  if (!orderId) return err("orderId шаардлагатай");

  const sb = getSupabaseAdmin();
  const { data: intent } = await sb
    .from("payment_intents")
    .select("*")
    .eq("order_id", orderId)
    .eq("provider", "OMNIWAY")
    .eq("status", "PAID")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const invoiceNumber = (intent?.storepay_response as any)?.invoice_number;
  if (!invoiceNumber) return err("OmniWay төлөгдсөн нэхэмжлэх олдсонгүй", 404);

  const res = await omniFetch(`/ecommerce/invoices/${invoiceNumber}/order-delivered`, {
    method: "POST",
    body: JSON.stringify(orderAmount ? { orderAmount: Math.round(Number(orderAmount)) } : {}),
  });
  if (!res.ok) return err(res.data?.message || "Хүргэгдсэн болгож чадсангүй", 502);
  return json({ ok: true, response: res.data });
}

async function handleSalesReturn(body: any, req: Request) {
  if (!(await requireAdmin(req))) return err("Зөвшөөрөлгүй", 403);
  const { orderId, returnAmount } = body;
  if (!orderId || !returnAmount) return err("orderId болон returnAmount шаардлагатай");

  const sb = getSupabaseAdmin();
  const { data: intent } = await sb
    .from("payment_intents")
    .select("*")
    .eq("order_id", orderId)
    .eq("provider", "OMNIWAY")
    .eq("status", "PAID")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const invoiceNumber = (intent?.storepay_response as any)?.invoice_number;
  if (!invoiceNumber) return err("OmniWay төлөгдсөн нэхэмжлэх олдсонгүй", 404);

  const res = await omniFetch(`/ecommerce/invoices/${invoiceNumber}/sales-return`, {
    method: "POST",
    body: JSON.stringify({ returnAmount: Math.round(Number(returnAmount)) }),
  });
  if (!res.ok) return err(res.data?.message || "Буцаалт хийж чадсангүй", 502);
  return json({ ok: true, response: res.data });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
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
      case "cancel-invoice":
        return await handleCancelInvoice(body, req);
      case "order-delivered":
        return await handleOrderDelivered(body, req);
      case "sales-return":
        return await handleSalesReturn(body, req);
      default:
        return err("Unknown action. Use: create-invoice, check-payment, cancel-invoice, order-delivered, sales-return");
    }
  } catch (e: any) {
    console.error("OmniWay edge function error:", e);
    return err(e?.message || "Серверийн алдаа", 500);
  }
});
