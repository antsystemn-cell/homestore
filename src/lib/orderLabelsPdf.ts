import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface OrderItemLite {
  name?: string;
  quantity?: number;
  size?: string;
  color?: string;
}

export interface OrderForLabel {
  id: string;
  order_ref?: string | null;
  guest_name?: string | null;
  phone?: string | null;
  shipping_address?: string | null;
  items?: unknown;
  total?: number | null;
  created_at?: string | null;
}

/**
 * Generate a PDF where each order occupies one 70x80mm portrait page.
 * Contains: order ref, customer name, phone, delivery address, item list (no images).
 */
export async function downloadOrderLabelsPdf(
  orders: OrderForLabel[],
  filename = `orders-${new Date().toISOString().slice(0, 10)}.pdf`
) {
  if (!orders.length) return;

  const PAGE_W = 70;
  const PAGE_H = 80;
  const pdf = new jsPDF({ unit: "mm", format: [PAGE_W, PAGE_H], orientation: "portrait" });

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  document.body.appendChild(host);

  try {
    const PX_PER_MM = 3.78;
    const wPx = Math.round(PAGE_W * PX_PER_MM);
    const hPx = Math.round(PAGE_H * PX_PER_MM);

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const orderNo = o.order_ref || `#${o.id.slice(0, 8).toUpperCase()}`;
      const name = (o.guest_name || "").trim();
      const phone = (o.phone || "").trim();
      const addr = (o.shipping_address || "").trim();

      const itemsArr: OrderItemLite[] = Array.isArray(o.items) ? (o.items as OrderItemLite[]) : [];
      const itemsHtml = itemsArr
        .filter((it) => it && it.name)
        .map((it) => {
          const variant = [it.color, it.size].filter(Boolean).join(" / ");
          const v = variant ? ` (${escapeHtml(variant)})` : "";
          return `<div style="font-size:9px;line-height:1.25;">• ${escapeHtml(String(it.name))}${v} × ${it.quantity ?? 1}</div>`;
        })
        .join("");

      host.innerHTML = "";
      const card = document.createElement("div");
      card.style.cssText = `
        width: ${wPx}px;
        height: ${hPx}px;
        background: #ffffff;
        color: #000000;
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        display: flex;
        flex-direction: column;
        padding: 8px;
        box-sizing: border-box;
        gap: 4px;
        overflow: hidden;
      `;
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #000;padding-bottom:3px;">
          <div style="font-size:11px;font-weight:800;">${escapeHtml(orderNo)}</div>
        </div>
        ${name ? `<div style="font-size:10px;font-weight:700;">${escapeHtml(name)}</div>` : ""}
        ${phone ? `<div style="font-size:11px;font-weight:800;">📞 ${escapeHtml(phone)}</div>` : ""}
        ${addr ? `<div style="font-size:9px;line-height:1.3;word-break:break-word;">📍 ${escapeHtml(addr)}</div>` : ""}
        <div style="border-top:1px dashed #999;margin-top:2px;padding-top:3px;flex:1 1 auto;min-height:0;overflow:hidden;">
          <div style="font-size:9px;font-weight:700;margin-bottom:2px;">Бараа:</div>
          ${itemsHtml || '<div style="font-size:9px;color:#666;">—</div>'}
        </div>
      `;
      host.appendChild(card);

      const canvas = await html2canvas(card, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");
      pdf.addImage(dataUrl, "JPEG", 0, 0, PAGE_W, PAGE_H);
    }
  } finally {
    document.body.removeChild(host);
  }

  pdf.save(filename);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
