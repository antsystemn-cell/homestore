import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;

    // Verify admin role using service role to bypass RLS
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("DELIVERY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "DELIVERY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional deep-link params from the caller — forwarded to the partner
    // so the portal can open at a specific order when supported.
    let forward: Record<string, unknown> = {};
    try {
      const raw = await req.text();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const { external_order_id, delivery_order_id, order_ref } = parsed as Record<string, unknown>;
          if (external_order_id) forward.external_order_id = external_order_id;
          if (delivery_order_id) forward.delivery_order_id = delivery_order_id;
          if (order_ref) forward.order_ref = order_ref;
        }
      }
    } catch {
      forward = {};
    }

    const upstream = await fetch(
      "https://vvqbrpuiqzksygpcmrmg.supabase.co/functions/v1/partner-portal-session",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(forward),
      },
    );

    let text = await upstream.text();
    // If upstream returned OK + portal_url but ignored our deep-link,
    // append a hash the portal client may use to auto-focus the order.
    if (upstream.ok && (forward.external_order_id || forward.delivery_order_id)) {
      try {
        const parsed = JSON.parse(text);
        if (parsed?.portal_url && typeof parsed.portal_url === "string" && !/[#?]order=/i.test(parsed.portal_url)) {
          const key = (forward.external_order_id || forward.delivery_order_id) as string;
          const sep = parsed.portal_url.includes("#") ? "&" : "#";
          parsed.portal_url = `${parsed.portal_url}${sep}order=${encodeURIComponent(key)}`;
          text = JSON.stringify(parsed);
        }
      } catch { /* keep original */ }
    }
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("partner-portal-session error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
