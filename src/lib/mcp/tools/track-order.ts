import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "track_order",
  title: "Захиалга хянах (Track order)",
  description: "Get delivery and payment status for one of the signed-in user's orders by order reference or id.",
  inputSchema: {
    order_ref: z.string().trim().min(1).optional().describe("Order reference, e.g. 'ES-260814-123456'."),
    id: z.string().uuid().optional().describe("Order id (UUID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_ref, id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!order_ref && !id) {
      return { content: [{ type: "text", text: "Provide either `order_ref` or `id`." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("orders")
      .select(
        "id, order_ref, status, payment_status, delivery_status, total, items, shipping_address, created_at, assigned_at, picked_up_at, delivered_at",
      )
      .eq("user_id", ctx.getUserId()!)
      .limit(1);
    q = id ? q.eq("id", id) : q.eq("order_ref", order_ref!);

    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Захиалга олдсонгүй (order not found)." }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { order: data },
    };
  },
});
