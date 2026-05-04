import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

function formatUlaanbaatarDate(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ulaanbaatar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
  } catch {
    return "";
  }
}

export interface OrderItemLite {
  name?: string;
  quantity?: number;
  size?: string;
  color?: string;
  product_code?: string;
  sku?: string;
  price?: number;
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
  payment_method?: string | null;
  payment_status?: string | null;
}

const mnt = (n: number) => `${(n ?? 0).toLocaleString("mn-MN")}₮`;

function isPaid(o: OrderForLabel): boolean {
  const status = (o.payment_status || "").toLowerCase();
  return status === "confirmed" || status === "paid";
}

function isCashLike(o: OrderForLabel): boolean {
  const m = (o.payment_method || "cash").toLowerCase();
  return m === "cash" || m === "cod" || m === "" || m === "qpay";
}

function paymentLabel(o: OrderForLabel): string {
  const method = (o.payment_method || "cash").toLowerCase();
  const map: Record<string, string> = {
    cash: "Бэлэн", cod: "Бэлэн", qpay: "QPay", storepay: "Storepay", pocket: "Pocket",
  };
  const m = map[method] || method.toUpperCase();
  return isPaid(o) ? `Төлсөн (${m})` : `Төлөөгүй (${m})`;
}

async function fetchQpayQr(orderId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("qpay", {
      body: { action: "print-invoice", orderId },
    });
    if (error || !data?.qrImage) return null;
    const qr: string = data.qrImage;
    return qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
  } catch {
    return null;
  }
}

/**
 * Generate a PDF where each order occupies one 70x80mm portrait page.
 * Mirrors the printOrdersTable design (header bar, payment status, items list).
 * - Hides amount/price for paid orders
 * - Embeds a small QPay QR in the corner for unpaid cash-like orders
 */
export async function downloadOrderLabelsPdf(
  orders: OrderForLabel[],
  filename = `orders-${new Date().toISOString().slice(0, 10)}.pdf`
) {
  if (!orders.length) return;

  // Pre-fetch QR codes in parallel for unpaid orders
  const needsQr = orders.filter((o) => !isPaid(o) && isCashLike(o) && o.id);
  const qrEntries = await Promise.all(
    needsQr.map(async (o) => [o.id, await fetchQpayQr(o.id)] as const)
  );
  const qrMap = new Map<string, string | null>(qrEntries);

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
      const dateStr = o.created_at ? formatUlaanbaatarDate(o.created_at) : "";
      const paid = isPaid(o);
      const totalNum = Number(o.total) || 0;
      const payLbl = paymentLabel(o);
      const qrUrl = !paid && o.id ? qrMap.get(o.id) || null : null;

      const itemsArr: OrderItemLite[] = Array.isArray(o.items) ? (o.items as OrderItemLite[]) : [];
      const itemsHtml = itemsArr
        .filter((it) => it && it.name)
        .map((it) => {
          const variant = [it.color, it.size].filter(Boolean).join("/");
          const sku = it.product_code || it.sku || "";
          const meta = [variant, sku].filter(Boolean).join(" · ");
          const m = meta ? ` <span style="color:#666;">(${escapeHtml(meta)})</span>` : "";
          return `<div class="lbl-item" style="font-size:10px;line-height:1.3;margin-bottom:1px;">• ${escapeHtml(String(it.name))}${m} × ${it.quantity ?? 1}</div>`;
        })
        .join("");

      // Combine phone+address with dynamic font sizing
      const combined = [phone, addr].filter(Boolean).join(" • ");
      const len = combined.length;
      const fs = len > 110 ? 8 : len > 80 ? 9 : len > 50 ? 10 : 11;
      const lh = fs <= 9 ? 1.25 : 1.35;

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
        padding: 5px;
        box-sizing: border-box;
        gap: 2px;
        overflow: hidden;
        position: relative;
      `;
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:5px;background:#000;color:#fff;padding:3px 6px;border-radius:3px;">
          <span style="background:#fff;color:#000;padding:0 5px;border-radius:2px;font-size:10px;font-weight:800;">№${i + 1}</span>
          <span style="font-family:'Courier New',monospace;font-weight:800;font-size:12px;letter-spacing:0.3px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(orderNo)}</span>
          ${paid ? `<span style="background:#16a34a;color:#fff;padding:1px 4px;border-radius:2px;font-size:8px;font-weight:800;letter-spacing:0.3px;">ТӨЛСӨН</span>` : ""}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#444;font-weight:600;">
          <span>${escapeHtml(dateStr)}</span>
          ${!paid && totalNum > 0 ? `<span style="font-weight:800;color:#000;font-size:10px;">${escapeHtml(mnt(totalNum))}</span>` : ""}
        </div>
        ${name ? `<div style="font-size:11px;font-weight:700;">${escapeHtml(name)}</div>` : ""}
        ${combined ? `<div class="lbl-addr" style="font-size:${fs}px;font-weight:600;line-height:${lh};word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(combined)}</div>` : ""}
        <div class="lbl-items" style="border-top:1px dashed #999;margin-top:1px;padding-top:2px;flex:1 1 auto;min-height:0;overflow:hidden;${qrUrl ? `padding-right:54px;` : ""}">
          <div style="font-size:8px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px;">Бараа</div>
          ${itemsHtml || '<div class="lbl-item" style="font-size:10px;color:#666;">—</div>'}
        </div>
        <div class="lbl-footer" style="display:flex;justify-content:space-between;align-items:flex-end;font-size:9px;font-weight:700;color:${paid ? "#15803d" : "#b45309"};border-top:1px solid #000;padding-top:2px;${qrUrl ? `padding-right:54px;` : ""}">
          <span>${escapeHtml(payLbl)}</span>
        </div>
        ${qrUrl ? `<div style="position:absolute;right:4px;bottom:4px;background:#fff;padding:1px;border:1px solid #000;border-radius:2px;text-align:center;line-height:1;">
          <img src="${qrUrl}" alt="QR" style="display:block;width:60px;height:60px;image-rendering:pixelated;"/>
          <div style="font-size:6px;font-weight:700;margin-top:1px;">QPay</div>
        </div>` : ""}
      `;
      host.appendChild(card);

      // Auto-fit: shrink QR (and items font as fallback) until no overlap/overflow
      if (qrUrl) {
        const qrEl = card.querySelector<HTMLDivElement>('div[style*="position:absolute"]');
        const itemsBox = card.children[card.children.length - 3] as HTMLDivElement | undefined;
        const footerBox = card.children[card.children.length - 2] as HTMLDivElement | undefined;
        let qrSize = 50;
        const minQr = 32;
        const fits = (): boolean => {
          if (!qrEl || !itemsBox) return true;
          const cardRect = card.getBoundingClientRect();
          const qrRect = qrEl.getBoundingClientRect();
          const overflow = Array.from(card.querySelectorAll<HTMLElement>("*")).some((el) => {
            const r = el.getBoundingClientRect();
            return r.right > cardRect.right + 0.5 || r.bottom > cardRect.bottom + 0.5;
          });
          if (overflow) return false;
          const overlap = Array.from(itemsBox.querySelectorAll<HTMLElement>("div")).some((el) => {
            const r = el.getBoundingClientRect();
            return !(r.right <= qrRect.left || r.left >= qrRect.right || r.bottom <= qrRect.top || r.top >= qrRect.bottom);
          });
          return !overlap;
        };
        let guard = 0;
        while (!fits() && guard < 12) {
          guard++;
          if (qrSize > minQr) {
            qrSize -= 2;
            const img = qrEl?.querySelector("img") as HTMLImageElement | null;
            if (img) { img.style.width = `${qrSize}px`; img.style.height = `${qrSize}px`; }
            const pad = `${qrSize + 6}px`;
            if (itemsBox) itemsBox.style.paddingRight = pad;
            if (footerBox) footerBox.style.paddingRight = pad;
          } else {
            itemsBox?.querySelectorAll<HTMLElement>("div").forEach((el) => {
              const cur = parseFloat(getComputedStyle(el).fontSize) || 8.5;
              if (cur > 6.5) el.style.fontSize = `${cur - 0.5}px`;
            });
          }
        }
      }

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
