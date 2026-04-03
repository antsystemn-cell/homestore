import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STOREPAY_BASE = "https://service.storepay.mn:8778/lend-merchant";
const STOREPAY_AUTH_URL =
  "https://service.storepay.mn:8778/merchant-uaa/oauth/token";

// ---------- helpers ----------

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storepay auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
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

// ---------- route handlers ----------

async function handleEligibility(body: any) {
  const { phone } = body;
  if (!phone || !/^\d{8}$/.test(phone)) {
    return err("Утасны дугаар 8 оронтой тоо байх ёстой");
  }

  const token = await getStorepayToken();

  const res = await fetch(`${STOREPAY_BASE}/user/possibleAmount`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mobileNumber: phone }),
  });

  const responseText = await res.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    return err(`Storepay API хариу буруу: ${responseText}`, 502);
  }

  console.log("Storepay eligibility response:", JSON.stringify(data));

  // API returns: { "value": 500000.0, "msgList": [], "attrs": {}, "status": "Success" }
  // value = 0 means no credit, value > 0 means eligible
  if (data.status !== "Success") {
    // Check msgList for error messages
    const msg = data.msgList?.[0]?.code || data.msgList?.[0]?.text || "Storepay API алдаа";
    return json({
      eligible: false,
      possibleAmount: 0,
      reason: "API_ERROR",
      message: msg,
    });
  }

  const possibleAmount = typeof data.value === "number" ? data.value : 0;

  return json({
    eligible: possibleAmount > 0,
    possibleAmount,
    reason: possibleAmount > 0 ? "ELIGIBLE" : "INSUFFICIENT_CREDIT",
    message:
      possibleAmount > 0
        ? `Боломжит лимит: ${Number(possibleAmount).toLocaleString()}₮`
        : "Таны Storepay зээлийн эрх хүрэлцэхгүй байна",
  });
}

async function handleCreateLoan(body: any, req: Request) {
  const userId = await getUserId(req);
  // Allow guest users (userId may be null)

  const { phone, amount, description, orderId, type } = body;

  if (!phone || !/^\d{8}$/.test(phone)) {
    return err("Утасны дугаар 8 оронтой тоо байх ёстой");
  }
  if (!amount || amount <= 0) {
    return err("Төлбөрийн дүн буруу байна");
  }

  const storeId = parseInt(Deno.env.get("STOREPAY_STORE_ID") || "0");
  if (!storeId) return err("Store тохиргоо алдаатай", 500);

  const requestId = crypto.randomUUID();
  const supabaseAdmin = getSupabaseAdmin();

  // Prevent duplicate: check if there's already a WAITING intent for this order
  if (orderId) {
    const { data: existing } = await supabaseAdmin
      .from("payment_intents")
      .select("id, status")
      .eq("order_id", orderId)
      .in("status", ["INITIATED", "WAITING"])
      .limit(1);

    if (existing && existing.length > 0) {
      return err("Энэ захиалгад төлбөр аль хэдийн үүсгэгдсэн байна");
    }
  }

  // Create payment intent record first
  const intentData: any = {
    order_id: orderId || null,
    type: type || "ORDER",
    phone,
    amount,
    request_id: requestId,
    status: "INITIATED",
  };
  if (userId) intentData.user_id = userId;

  const { data: intent, error: intentError } = await supabaseAdmin
    .from("payment_intents")
    .insert(intentData)
      order_id: orderId || null,
      type: type || "ORDER",
      phone,
      amount,
      request_id: requestId,
      status: "INITIATED",
    })
    .select()
    .single();

  if (intentError) {
    return err("Төлбөрийн бүртгэл үүсгэхэд алдаа: " + intentError.message, 500);
  }

  // Get Storepay token and create loan
  const token = await getStorepayToken();

  const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/storepay-webhook`;

  const loanPayload = {
    storeId,
    mobileNumber: phone,
    description: description || "Захиалгын төлбөр",
    amount: Math.round(amount),
    callbackUrl,
    requestId,
  };

  const res = await fetch(`${STOREPAY_BASE}/merchant/loan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loanPayload),
  });

  const responseText = await res.text();
  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { raw: responseText };
  }

  console.log("Storepay create-loan response:", JSON.stringify(responseData));

  // API returns: { "value": 9272, "msgList": [], "attrs": {}, "status": "Success" }
  // On failure: { "value": null, "msgList": [{...}], "attrs": {}, "status": "Failed" }
  if (!res.ok || responseData?.status === "Failed") {
    const errorMsg = responseData?.msgList?.[0]?.code || responseData?.msgList?.[0]?.text || "Storepay нэхэмжлэл үүсгэхэд алдаа гарлаа";
    await supabaseAdmin
      .from("payment_intents")
      .update({ status: "FAILED", storepay_response: responseData })
      .eq("id", intent.id);

    return err(errorMsg, 502);
  }

  // value contains the loan ID
  const loanId = responseData?.value || null;

  await supabaseAdmin
    .from("payment_intents")
    .update({
      status: "WAITING",
      loan_id: loanId ? String(loanId) : null,
      storepay_response: responseData,
    })
    .eq("id", intent.id);

  return json({
    success: true,
    intentId: intent.id,
    loanId,
    requestId,
    message: "Storepay апп руугаа нэвтэрч төлбөрөө баталгаажуулна уу",
  });
}

async function handleCheckStatus(body: any, req: Request) {
  const userId = await getUserId(req);
  // Allow guest users (userId may be null)

  const { intentId, loanId, requestId } = body;

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch intent
  let intent: any;
  if (intentId) {
    let query = supabaseAdmin
      .from("payment_intents")
      .select("*")
      .eq("id", intentId);
    
    // For authenticated users, scope to their user_id; for guests, scope to null user_id
    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.is("user_id", null);
    }
    
    const { data } = await query.single();
    intent = data;
  }

  if (!intent) return err("Төлбөрийн мэдээлэл олдсонгүй", 404);

  // If already PAID or FAILED, return current status
  if (intent.status === "PAID" || intent.status === "FAILED") {
    return json({ status: intent.status, intentId: intent.id });
  }

  // Check with Storepay API
  const token = await getStorepayToken();
  const checkId = intent.loan_id || loanId;

  let checkUrl: string;
  if (checkId) {
    checkUrl = `${STOREPAY_BASE}/merchant/loan/check/${checkId}`;
  } else if (intent.request_id || requestId) {
    checkUrl = `${STOREPAY_BASE}/merchant/loan/checkRequest/${intent.request_id || requestId}`;
  } else {
    return json({ status: intent.status, intentId: intent.id });
  }

  const res = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return json({ status: "WAITING", intentId: intent.id, detail: text });
  }

  const data = await res.json();
  console.log("Storepay check-status response:", JSON.stringify(data));

  // By loanId: { "value": true/false, "status": "Success" }
  // By requestId: { "value": { "loanId": 181685, "isExist": true, "isConfirmed": false }, "status": "Success" }
  let isConfirmed = false;
  if (data.status === "Success") {
    if (typeof data.value === "boolean") {
      isConfirmed = data.value === true;
    } else if (typeof data.value === "object" && data.value !== null) {
      isConfirmed = data.value.isConfirmed === true;
    }
  }

  if (isConfirmed) {
    await supabaseAdmin
      .from("payment_intents")
      .update({ status: "PAID", storepay_response: data })
      .eq("id", intent.id);

    if (intent.order_id) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "storepay",
          payment_intent_id: intent.id,
          status: "confirmed",
        })
        .eq("id", intent.order_id);
    }

    return json({ status: "PAID", intentId: intent.id });
  }

  return json({ status: "WAITING", intentId: intent.id });
}

// ---------- main handler ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // GET requests or empty body
    }

    const action = body.action || new URL(req.url).searchParams.get("action");

    switch (action) {
      case "eligibility":
        return await handleEligibility(body);
      case "create-loan":
        return await handleCreateLoan(body, req);
      case "check-status":
        return await handleCheckStatus(body, req);
      default:
        return err("Unknown action. Use: eligibility, create-loan, check-status");
    }
  } catch (e: any) {
    console.error("Storepay edge function error:", e);
    return err(e.message || "Серверийн алдаа", 500);
  }
});
