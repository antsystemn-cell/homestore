import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_product",
  title: "Барааны дэлгэрэнгүй (Get product)",
  description: "Get full details for one product by its URL slug or id: price, description, colors, sizes and stock.",
  inputSchema: {
    slug: z.string().trim().min(1).optional().describe("Product URL slug, e.g. 'hotbrush'."),
    id: z.string().uuid().optional().describe("Product id (UUID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!slug && !id) {
      return { content: [{ type: "text", text: "Provide either `slug` or `id`." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("products")
      .select(
        "id, name, slug, category, description, price, original_price, discount, is_on_sale, is_bogo, is_new, stock_quantity, colors, sizes, variant_stock, specifications, sales",
      )
      .eq("is_active", true)
      .limit(1);
    q = id ? q.eq("id", id) : q.eq("slug", slug!);

    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Бараа олдсонгүй (product not found)." }], isError: true };

    const product = { ...data, url: `https://easyshop.mn/product/${data.slug}` };
    return {
      content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      structuredContent: { product },
    };
  },
});
