const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Та Монгол хэлээр борлуулалтын захиалгыг задлан ялгаж JSON гаргадаг мэргэшсэн туслах юм.

Хэрэглэгчийн чөлөөт бичсэн (эсвэл ярьсан) текстээс дараах ЯГ энэ форматтай JSON л буцаа:
{
  "phone": "8 оронтой Монгол дугаар (олдохгүй бол \"\")",
  "address": {
    "district": "дүүрэг (СБД, БЗД, ХУД, ЧД, БГД, СХД гэх мэт бүтэн нэр)",
    "khoroo": "хороо (тоо)",
    "khoroolol": "хороолол/байршил",
    "building": "байр/гэрийн дугаар",
    "apt": "тоот",
    "note": "нэмэлт тэмдэглэл",
    "full": "бүх хаягийг цэвэрхэн нэг мөрөнд нэгтгэсэн"
  },
  "items": [
    {
      "name": "барааны нэр (текстэд байгаа шиг)",
      "quantity": тоо,
      "matched_product_id": "олдвол ID, олдохгүй бол null",
      "matched_product_name": "олдсон бүтээгдэхүүний нэр эсвэл null",
      "confidence": 0-1 хооронд тоо
    }
  ],
  "source": "Facebook | Instagram | Утас | Messenger | Direct | \"\"",
  "note": "AI тэмдэглэл (жишээ нь: 'quantity таамагласан', 'бараа тодорхойгүй')"
}

Дүрэм:
- Утас: 8 оронтой, 6-9 -р эхэлсэн Монгол дугаар. Зайг арилга.
- Тоо ширхэг: "2ш", "хоёр", "2 ширхэг", "хос" гэх мэт ойлгож бүхэл тоо болго. Олдохгүй бол 1.
- Бараа таних: доор өгсөн PRODUCTS каталогтой ойролцоо нэрээр тааруулж matched_product_id, matched_product_name, confidence-ыг бөглө. Confidence < 0.5 бол null үлдээ.
- Өнгө/хэмжээ (жишээ "хар өмд L") барааны нэрний хэсэг гэж үз.
- Хаягийг задлан ялга. Бүх хэсгийг олоогүй бол "" үлдээж, "full" талбарт бүхэлд нь бич.
- Зөвхөн зөв JSON л буцаа. Markdown/тайлбар нэмж болохгүй.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY тохируулагдаагүй" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { text, products } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Текст хоосон байна" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compact catalog: id|name|price  — cap to avoid huge prompts
    const catalog: Array<{ id: string; name: string; price: number }> = Array.isArray(products)
      ? products.slice(0, 400)
      : [];
    const catalogText = catalog.length
      ? "PRODUCTS каталог (id | нэр | үнэ₮):\n" +
        catalog.map((p) => `${p.id} | ${p.name} | ${p.price}`).join("\n")
      : "PRODUCTS каталог өгөгдөөгүй — matched_product_id-г null-ээр буцаа.";

    const userMsg = `${catalogText}\n\n---\nЗАХИАЛГЫН ТЕКСТ:\n${text}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
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

    // Normalize address (support both old string form and new object form)
    let addressFull = "";
    let addressObj: any = null;
    if (typeof parsed.address === "string") {
      addressFull = parsed.address.trim();
    } else if (parsed.address && typeof parsed.address === "object") {
      addressObj = parsed.address;
      addressFull =
        String(parsed.address.full ?? "").trim() ||
        [parsed.address.district, parsed.address.khoroolol, parsed.address.khoroo && `${parsed.address.khoroo}-р хороо`, parsed.address.building && `${parsed.address.building}-р байр`, parsed.address.apt && `${parsed.address.apt} тоот`, parsed.address.note]
          .filter(Boolean).join(", ");
    }

    // Build a quick id->price lookup so we surface prices immediately.
    const priceById = new Map(catalog.map((p) => [p.id, p.price]));

    const out = {
      phone: String(parsed.phone ?? "").replace(/\D/g, "").slice(0, 8),
      address: addressFull,
      addressParts: addressObj,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((it: any) => {
            const pid = it?.matched_product_id && priceById.has(String(it.matched_product_id))
              ? String(it.matched_product_id)
              : null;
            return {
              name: String(it?.name ?? "").trim(),
              quantity: Math.max(1, parseInt(it?.quantity ?? 1) || 1),
              matched_product_id: pid,
              matched_product_name: pid ? String(it.matched_product_name ?? "").trim() : null,
              price: pid ? Number(priceById.get(pid)) || 0 : 0,
              confidence: Math.max(0, Math.min(1, Number(it?.confidence ?? 0))),
            };
          }).filter((it: any) => it.name)
        : [],
      source: String(parsed.source ?? "").trim(),
      note: String(parsed.note ?? "").trim(),
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
