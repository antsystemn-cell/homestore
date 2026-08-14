import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_orders",
  title: "Миний захиалгууд (List my orders)",
  description: "List the signed-in user's own orders with status, payment status, total and items.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filter by order status."),
    limit: z.number().int().min(1).max(50).default(10).describe("Max number of orders."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("orders")
      .select(
        "id, order_ref, status, payment_status, payment_method, total, delivery_fee, items, shipping_address, created_at, delivered_at",
      )
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { orders: data ?? [], count: (data ?? []).length },
    };
  },
});
