const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Та Монгол хэлээр борлуулалтын захиалгыг задлан ялгаж JSON гаргадаг туслах юм.
Хэрэглэгчийн чөлөөт бичсэн текстээс дараах JSON форматаар л буцаа (өөр юу ч бүү бич):
{
  "phone": "утасны дугаар (зөвхөн 8 оронтой Монгол дугаар, олдохгүй бол хоосон)",
  "address": "хаяг (дүүрэг, хороолол, гэр/байр гэх мэт)",
  "items": [{ "name": "барааны нэр", "quantity": тоо }],
  "source": "Facebook эсвэл Утас (мэдэгдэхгүй бол хоосон)"
}
Зөвхөн зөв JSON буцаа. Тайлбар нэмж болохгүй. Барааны quantity олдохгүй бол 1 гэж бич.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY тохируулагдаагүй" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Текст хоосон байна" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: "Claude алдаа: " + err }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const raw = data?.content?.[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(JSON.stringify({ error: "JSON олдсонгүй", raw }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any;
    try { parsed = JSON.parse(match[0]); } catch {
      return new Response(JSON.stringify({ error: "JSON parse алдаа", raw }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const out = {
      phone: String(parsed.phone ?? "").trim(),
      address: String(parsed.address ?? "").trim(),
      items: Array.isArray(parsed.items)
        ? parsed.items.map((it: any) => ({
            name: String(it?.name ?? "").trim(),
            quantity: Math.max(1, parseInt(it?.quantity ?? 1) || 1),
          })).filter((it: any) => it.name)
        : [],
      source: String(parsed.source ?? "").trim(),
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
