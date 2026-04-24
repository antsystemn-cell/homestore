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

async function buildProductCatalog(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from("products")
      .select("name, description, price, category, is_active")
      .eq("is_active", true)
      .order("sales", { ascending: false })
      .limit(200);

    if (error || !data || data.length === 0) {
      if (error) console.error("Catalog fetch error:", error);
      return "";
    }

    const lines = data.map((p: any, i: number) => {
      const desc = (p.description ?? "").toString().replace(/\s+/g, " ").trim().slice(0, 160);
      const price = Number(p.price ?? 0).toLocaleString("mn-MN");
      const stock = p.is_active ? "байна" : "дууссан";
      return `${i + 1}. ${p.name} — ${price}₮\n   Тайлбар: ${desc || "—"}\n   Ангилал: ${p.category ?? "—"}\n   Нөөц: ${stock}`;
    });

    return `\n\n=== ДЭЛГҮҮРИЙН БАРААНУУД ===\n${lines.join("\n")}\n=== ТӨГСГӨЛ ===\n`;
  } catch (e) {
    console.error("buildProductCatalog failed:", e);
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY тохируулагдаагүй байна" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const baseSystemPrompt: string =
      typeof body?.systemPrompt === "string" && body.systemPrompt.trim().length > 0
        ? body.systemPrompt
        : "Та easyshop.mn онлайн дэлгүүрийн туслах ажилтан. Монгол хэлээр товч, найрсаг хариу өгнө.";

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages хоосон байна" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanMessages = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }));

    const catalog = await buildProductCatalog();
    const systemPrompt =
      baseSystemPrompt +
      catalog +
      (catalog
        ? "\nДээрх жагсаалтаас хэрэглэгчид зөв бараа санал болго. Үнэ, ангилал, нөөцийг үнэн зөв хэлнэ үү."
        : "");

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: cleanMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI үйлчилгээ алдаа гарлаа", detail: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await anthropicRes.json();
    const reply: string =
      data?.content?.find((c: any) => c.type === "text")?.text ?? "Уучлаарай, хариу өгч чадсангүй.";

    return new Response(JSON.stringify({ reply }), {
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
