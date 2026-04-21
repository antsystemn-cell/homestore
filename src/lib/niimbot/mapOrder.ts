import type { NiimbotLabelData, OrderLike } from "./types";

interface OrderItem {
  name?: string;
  quantity?: number;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  confirmed: "Төлсөн",
  paid: "Төлсөн",
  unpaid: "Бэлэн мөнгө",
  pending: "Бэлэн мөнгө",
};

const formatTugrug = (n: number): string => `₮${n.toLocaleString("mn-MN")}`;

const buildOrderNo = (o: OrderLike): string => {
  if (o.order_ref) return o.order_ref;
  return `#${o.id.slice(0, 8).toUpperCase()}`;
};

const splitAddress = (raw?: string | null): { district: string; address: string } => {
  if (!raw) return { district: "", address: "" };
  const trimmed = raw.trim();
  // Try to split on first comma — first chunk usually contains district/khoroo
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx > 0 && commaIdx < 60) {
    return {
      district: trimmed.slice(0, commaIdx).trim(),
      address: trimmed.slice(commaIdx + 1).trim(),
    };
  }
  return { district: "", address: trimmed };
};

const buildItemsString = (raw: unknown): string => {
  if (!Array.isArray(raw)) return "";
  return (raw as OrderItem[])
    .filter((i) => i && i.name)
    .map((i) => `${i.name} × ${i.quantity ?? 1}`)
    .join(", ");
};

export function mapOrderToLabelData(order: OrderLike): NiimbotLabelData {
  const paymentStatusKey = (order.payment_status || "unpaid").toLowerCase();
  const isPaid = paymentStatusKey === "confirmed" || paymentStatusKey === "paid";
  const paymentStatus = PAYMENT_STATUS_LABELS[paymentStatusKey] || order.payment_status || "Бэлэн мөнгө";
  const { district, address } = splitAddress(order.shipping_address);

  return {
    order_no: buildOrderNo(order),
    customer_name: order.guest_name?.trim() || "",
    phone: order.phone || "",
    phone2: "",
    district,
    address,
    payment_status: paymentStatus,
    payment_amount: isPaid ? "" : formatTugrug(Number(order.total || 0)),
    items: buildItemsString(order.items),
    tracking_code: order.delivery_order_id || "",
    note: "",
  };
}
