import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProductRow {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  original_price: number | null;
  category: string | null;
  thumbnail_url: string | null;
  image_url: string | null;
  stock_quantity: number | null;
  is_active: boolean | null;
  sales: number | null;
  is_on_sale?: boolean | null;
}

const MAX_CATALOG = 60;
const MAX_MATCHES = 12;
const MAX_HISTORY = 8;
const MAX_RECS = 6;

// ---- helpers ---------------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function extractPrice(text: string): { min?: number; max?: number } {
  const t = text.toLowerCase().replace(/,/g, "");
  const parseNum = (s: string): number => {
    const m = s.match(/([\d.]+)\s*(сая|мянга|k|m)?/);
    if (!m) return NaN;
    let n = parseFloat(m[1]);
    const suf = (m[2] || "").toLowerCase();
    if (suf === "сая" || suf === "m") n *= 1_000_000;
    else if (suf === "мянга" || suf === "k") n *= 1_000;
    else if (n < 1000) n *= 1000; // "500-с доош" → assume ,000 mnt in retail context
    return n;
  };
  // "X-с доош|дор|доошгүй|хямд" / "X-аас доош" / "<X"
  const under = t.match(/([\d.,]+\s*(?:сая|мянга|k|m)?)\s*(?:мнт|₮|төгрөг)?\s*[-–]?(?:с|аас|ээс|оос)?\s*(доош|дор|хямд|бага|below|less|<)/);
  // "X-аас дээш|илүү" / ">X"
  const over = t.match(/([\d.,]+\s*(?:сая|мянга|k|m)?)\s*(?:мнт|₮|төгрөг)?\s*[-–]?(?:с|аас|ээс|оос)?\s*(дээш|илүү|above|more|>)/);
  // range "X-Y" / "X - Y" / "X-аас Y хүртэл"
  const range = t.match(/([\d.,]+\s*(?:сая|мянга|k|m)?)\s*[-–]\s*([\d.,]+\s*(?:сая|мянга|k|m)?)/);
  const out: { min?: number; max?: number } = {};
  if (range) {
    const a = parseNum(range[1]);
    const b = parseNum(range[2]);
    if (!isNaN(a) && !isNaN(b)) { out.min = Math.min(a, b); out.max = Math.max(a, b); return out; }
  }
  if (under) {
    const n = parseNum(under[1]);
    if (!isNaN(n)) out.max = n;
  }
  if (over) {
    const n = parseNum(over[1]);
    if (!isNaN(n)) out.min = n;
  }
  return out;
}

function scoreProduct(p: ProductRow, terms: string[]): number {
  if (terms.length === 0) return 0;
  const hay = normalize(`${p.name} ${p.category ?? ""}`);
  let score = 0;
  for (const t of terms) {
    if (!t) continue;
    if (hay.includes(t)) score += t.length >= 3 ? 3 : 1;
  }
  return score;
}

const STOPWORDS = new Set([
  "би","та","бол","юм","бий","гэж","гэсэн","байна","байх","минь","чинь","байгаа","бидэн","бидний","хийх","хийж","гэж","үү","уу","юу","нь","бас","одоо","өнөөдөр","маргааш","өчигдөр","аль","хамгийн","болох","байхгүй","байсан","байгаа","болно","хэрэг","хэрэгтэй","одоогоор","ирэх","ирсэн","л","ч","бол","үнэтэй","үнэ","үнээр","хямд","доош","дээш","илүү","бага","болон","мөн","эсвэл","гэх","мэт","санал","болгооч","болгоно","болгож","өгөөч","өгөх","авах","авмаар","аваад","авъя","сонирхож","ямар","ямарч","хайж","чи","та","нар","бүх","бүгд","юу","юуг","үнэхээр","really","for","the","and","give","me","under","below","above","between"
]);

function extractTerms(text: string): string[] {
  const words = normalize(text).split(" ").filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  return Array.from(new Set(words)).slice(0, 8);
}

async function fetchCatalog(supabase: any): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, price, original_price, category, thumbnail_url, image_url, stock_quantity, is_active, sales, is_on_sale")
    .eq("is_active", true)
    .order("sales", { ascending: false })
    .limit(MAX_CATALOG);
  if (error) { console.error("catalog fetch failed:", error); return []; }
  return (data as ProductRow[]) || [];
}

async function fetchMatches(supabase: any, terms: string[], priceMin?: number, priceMax?: number): Promise<ProductRow[]> {
  let q = supabase
    .from("products")
    .select("id, slug, name, price, original_price, category, thumbnail_url, image_url, stock_quantity, is_active, sales, is_on_sale")
    .eq("is_active", true);

  if (priceMin != null) q = q.gte("price", priceMin);
  if (priceMax != null) q = q.lte("price", priceMax);

  // Build ilike OR clause across name/category for the top terms
  const filterable = terms.filter((t) => t.length >= 3).slice(0, 4);
  if (filterable.length > 0) {
    const ors = filterable
      .map((t) => `name.ilike.%${t}%,category.ilike.%${t}%`)
      .join(",");
    q = q.or(ors);
  }
  q = q.order("sales", { ascending: false }).limit(30);
  const { data, error } = await q;
  if (error) { console.error("matches fetch failed:", error); return []; }
  return (data as ProductRow[]) || [];
}

async function fetchUserContext(supabase: any, userId: string | null): Promise<{
  history: { id: string; name: string; category: string | null; last_ordered_at: string }[];
  recommendations: ProductRow[];
}> {
  if (!userId) return { history: [], recommendations: [] };
  try {
    // Past orders → collect product_ids
    const { data: orders } = await supabase
      .from("orders")
      .select("items, created_at")
      .eq("user_id", userId)
      .in("status", ["delivered", "completed", "confirmed", "delivering", "paid"])
      .order("created_at", { ascending: false })
      .limit(15);

    const pidToDate = new Map<string, string>();
    (orders || []).forEach((o: any) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((it: any) => {
        const pid = typeof it?.product_id === "string" ? it.product_id : null;
        if (pid && !pidToDate.has(pid)) pidToDate.set(pid, o.created_at);
      });
    });

    let history: { id: string; name: string; category: string | null; last_ordered_at: string }[] = [];
    if (pidToDate.size > 0) {
      const ids = Array.from(pidToDate.keys()).slice(0, MAX_HISTORY);
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, category")
        .in("id", ids);
      history = (prods || []).map((p: any) => ({
        id: p.id, name: p.name, category: p.category,
        last_ordered_at: pidToDate.get(p.id) || "",
      }));
    }

    // Personalized recs via existing RPC
    let recommendations: ProductRow[] = [];
    try {
      const { data: recRows } = await supabase.rpc("get_personalized_recommendations", { _limit: MAX_RECS });
      const recIds: string[] = (recRows || []).map((r: any) => r.product_id).filter(Boolean);
      if (recIds.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, slug, name, price, original_price, category, thumbnail_url, image_url, stock_quantity, is_active, sales, is_on_sale")
          .in("id", recIds).eq("is_active", true);
        recommendations = (prods || []) as ProductRow[];
      }
    } catch (e) { console.warn("recs failed", e); }

    return { history, recommendations };
  } catch (e) {
    console.error("user context failed", e);
    return { history: [], recommendations: [] };
  }
}

function serializeProduct(p: ProductRow): string {
  const price = Number(p.price ?? 0).toLocaleString("mn-MN");
  const stock = p.stock_quantity == null ? "тодорхойгүй" : (p.stock_quantity > 0 ? `${p.stock_quantity} ширхэг` : "нөөц дууссан");
  const url = p.slug ? `https://easyshop.mn/product/${p.slug}` : `https://easyshop.mn/product/${p.id}`;
  const parts = [
    `ID: ${p.id}`,
    `Нэр: ${p.name}`,
    `Үнэ: ${price}₮`,
    `Ангилал: ${p.category ?? "—"}`,
    `Нөөц: ${stock}`,
    `Линк: ${url}`,
  ];
  return parts.join(" | ");
}

// ---- main ------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY тохируулагдаагүй байна" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const baseSystemPrompt: string = typeof body?.systemPrompt === "string" && body.systemPrompt.trim().length > 0
      ? body.systemPrompt
      : "Та easyshop.mn онлайн дэлгүүрийн туслах ажилтан. Монгол хэлээр товч, найрсаг хариу өгнө.";
    const userId: string | null = typeof body?.userId === "string" && body.userId.length > 8 ? body.userId : null;

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages хоосон байна" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanMessages = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }));

    const lastUser = [...cleanMessages].reverse().find((m) => m.role === "user")?.content || "";
    const terms = extractTerms(lastUser);
    const { min: priceMin, max: priceMax } = extractPrice(lastUser);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch in parallel
    const [catalog, matches, userCtx] = await Promise.all([
      fetchCatalog(supabase),
      fetchMatches(supabase, terms, priceMin, priceMax),
      fetchUserContext(supabase, userId),
    ]);

    // Rank matches by relevance
    const scored = matches
      .map((p) => ({ p, s: scoreProduct(p, terms) + (p.sales ? Math.log10(1 + Number(p.sales)) : 0) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_MATCHES)
      .map((x) => x.p);

    // Dedupe available list: matches → recs → fallback catalog
    const seen = new Set<string>();
    const available: ProductRow[] = [];
    const addAll = (arr: ProductRow[], cap: number) => {
      for (const p of arr) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        available.push(p);
        if (available.length >= cap) break;
      }
    };
    addAll(scored, 12);
    addAll(userCtx.recommendations, 18);
    addAll(catalog, 30);

    const catalogBlock = available.length
      ? `\n\n=== БОДИТ БАРААНЫ ЖАГСААЛТ (real-time DB) ===\n${available.map((p, i) => `${i + 1}. ${serializeProduct(p)}`).join("\n")}\n=== ТӨГСГӨЛ ===\n`
      : "";

    const historyBlock = userCtx.history.length
      ? `\n\n=== ХЭРЭГЛЭГЧИЙН ӨМНӨХ ХУДАЛДАН АВАЛТ ===\n${userCtx.history.map((h, i) => `${i + 1}. ${h.name} (${h.category ?? "—"})`).join("\n")}\n=== ТӨГСГӨЛ ===\n`
      : "";

    const recsBlock = userCtx.recommendations.length
      ? `\n\n=== ТУС ХЭРЭГЛЭГЧИД САНАЛ БОЛГОХ БАРААНУУД ===\n${userCtx.recommendations.map((p, i) => `${i + 1}. ${serializeProduct(p)}`).join("\n")}\n=== ТӨГСГӨЛ ===\n`
      : "";

    const priceHintBlock = priceMin != null || priceMax != null
      ? `\n\n(Хэрэглэгчийн үнийн шүүлт: ${priceMin != null ? `${priceMin.toLocaleString("mn-MN")}₮-с их` : ""}${priceMin != null && priceMax != null ? ", " : ""}${priceMax != null ? `${priceMax.toLocaleString("mn-MN")}₮-с бага` : ""}. Зөвхөн энэ мужид тохирох бараагаар л санал болго.)`
      : "";

    const systemPrompt = `${baseSystemPrompt}

Та зөвхөн доор өгсөн "БОДИТ БАРААНЫ ЖАГСААЛТ"-аас бараа санал болгоно. Жагсаалтад байхгүй бараа зохион гаргаж болохгүй. Үнэ, нөөц, ID нь real-time мэдээлэл тул тэр хэвээр нь ашигла. Барааны үнийг яг байгаагаар нь үнэн зөв гаргаж өгнө үү.

Барааг санал болгохдоо тухайн бараа бүрийн ID-г ашиглан яг дараах форматын товчлолыг тусад нь мөр болгож бичнэ:
[[PRODUCT:<id>]]
Тайлбар:
- <id> нь БОДИТ БАРААНЫ ЖАГСААЛТ-ын "ID" талбарын утга байна.
- Товчлолын өмнө/дараа богино тайлбар текст бичиж болно, гэхдээ товчлол өөрөө тусдаа мөр байх ёстой.
- Нэг хариунд 5-аас илүүгүй бараа санал болго.
- Хэрэглэгчид тохирох бараа олдоогүй бол шударгаар "Тохирох бараа олдсонгүй" гэж хэлж, өөр сонголт санал болго.

Хэрэв "ХЭРЭГЛЭГЧИЙН ӨМНӨХ ХУДАЛДАН АВАЛТ" блок байвал, тухайн хэрэглэгчид "Та өмнө нь [X] авсан байна, үүнтэй тохирох [Y] байна" гэх мэт proactive санал өг.

Товчлолгүй ерөнхий асуултад товч, найрсаг хариу өгнө үү.${priceHintBlock}${historyBlock}${recsBlock}${catalogBlock}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: systemPrompt,
        messages: cleanMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: "AI үйлчилгээ алдаа гарлаа", detail: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await anthropicRes.json();
    const reply: string = data?.content?.find((c: any) => c.type === "text")?.text ?? "Уучлаарай, хариу өгч чадсангүй.";

    // Extract referenced product IDs and return their product cards
    const idMatches = Array.from(reply.matchAll(/\[\[PRODUCT:([0-9a-fA-F-]{8,})\]\]/g)).map((m) => m[1]);
    const idSet = new Set(idMatches);
    const products = available
      .filter((p) => idSet.has(p.id))
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: Number(p.price ?? 0),
        original_price: p.original_price != null ? Number(p.original_price) : null,
        category: p.category,
        image: p.thumbnail_url || p.image_url || null,
        stock_quantity: p.stock_quantity,
        url: p.slug ? `/product/${p.slug}` : `/product/${p.id}`,
      }));

    return new Response(JSON.stringify({ reply, products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("claude-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
