import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_products",
  title: "Бараа хайх (Search products)",
  description:
    "Search the EasyShop catalog by name, category or brand. Returns name, price, discount, stock and product URL slug.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Text to match against product name."),
    category: z.string().trim().min(1).optional().describe("Filter by category code/name."),
    on_sale: z.boolean().optional().describe("Only products currently on sale."),
    limit: z.number().int().min(1).max(50).default(10).describe("Max number of results."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, on_sale, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("products")
      .select("id, name, slug, category, price, original_price, discount, is_on_sale, is_new, stock_quantity")
      .eq("is_active", true)
      .limit(limit ?? 10);

    if (query) q = q.ilike("name", `%${query}%`);
    if (category) q = q.eq("category", category);
    if (on_sale) q = q.eq("is_on_sale", true);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const items = (data ?? []).map((p) => ({
      ...p,
      url: `https://easyshop.mn/product/${p.slug}`,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { products: items, count: items.length },
    };
  },
});
