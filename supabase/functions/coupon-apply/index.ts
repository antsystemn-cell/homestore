import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await supa.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const { code, order_total } = await req.json();
    if (!code || typeof order_total !== "number") {
      return json({ error: "invalid_request" }, 400);
    }

    const { data: coupon } = await supa
      .from("spin_coupons")
      .select("*")
      .eq("code", code)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!coupon) return json({ valid: false, reason: "not_found" });
    if (coupon.is_used) return json({ valid: false, reason: "used" });
    if (coupon.invalidated_at) return json({ valid: false, reason: "invalidated" });
    if (new Date(coupon.expires_at) < new Date()) return json({ valid: false, reason: "expired" });
    if (order_total < Number(coupon.minimum_order_amount)) {
      return json({
        valid: false,
        reason: "below_minimum",
        minimum_order_amount: Number(coupon.minimum_order_amount),
      });
    }

    return json({
      valid: true,
      coupon_id: coupon.id,
      reward_type: coupon.reward_type,
      reward_value: Number(coupon.reward_value),
      minimum_order_amount: Number(coupon.minimum_order_amount),
      expires_at: coupon.expires_at,
    });
  } catch (e) {
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
