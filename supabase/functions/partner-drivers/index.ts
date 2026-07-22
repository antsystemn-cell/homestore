const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DRIVERS_URL = "https://vvqbrpuiqzksygpcmrmg.supabase.co/functions/v1/partner-drivers";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const apiKey = Deno.env.get("DELIVERY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "DELIVERY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const res = await fetch(DRIVERS_URL, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Upstream error", status: res.status, detail: body }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const drivers = Array.isArray(body?.drivers) ? body.drivers : [];
    return new Response(JSON.stringify({ drivers }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
