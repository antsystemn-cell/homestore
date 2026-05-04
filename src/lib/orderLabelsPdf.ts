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

      const itemsArr: OrderItemLite[] = (Array.isArray(o.items) ? (o.items as OrderItemLite[]) : []).filter((it) => it && it.name);
      // Uniform font size across the whole label
      const BASE_FS = 12;
      const itemsHtml = itemsArr
        .map((it) => {
          const variant = [it.color, it.size].filter(Boolean).join("/");
          const sku = it.product_code || it.sku || "";
          const meta = [variant, sku].filter(Boolean).join(" · ");
          const m = meta ? ` <span style="font-weight:500;">(${escapeHtml(meta)})</span>` : "";
          return `<div class="lbl-item" style="font-size:${BASE_FS}px;line-height:1.3;margin-bottom:2px;color:#000;font-weight:600;">• ${escapeHtml(String(it.name))}${m} × ${it.quantity ?? 1}</div>`;
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
        padding: 0;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        border: 1px solid #000;
      `;
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 8px;border-bottom:1px solid #000;font-size:${BASE_FS}px;">
          <span style="font-family:'Courier New',monospace;font-weight:800;font-size:${BASE_FS + 2}px;line-height:1.1;">${escapeHtml(orderNo)}</span>
          <span style="font-weight:600;font-size:${BASE_FS - 1}px;line-height:1.1;">№${i + 1}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:${BASE_FS}px;color:#000;font-weight:600;padding:4px 8px;border-bottom:1px solid #000;line-height:1.2;">
          <span>${escapeHtml(dateStr)}</span>
          ${totalNum > 0 ? `<span style="font-weight:800;">${escapeHtml(mnt(totalNum))}</span>` : ""}
        </div>
        ${name ? `<div style="font-size:${BASE_FS + 1}px;font-weight:800;padding:4px 8px 1px;line-height:1.25;">${escapeHtml(name)}</div>` : ""}
        ${phone ? `<div style="font-size:${BASE_FS + 2}px;font-weight:900;padding:1px 8px 3px;line-height:1.2;font-family:'Courier New',monospace;letter-spacing:0.5px;">${escapeHtml(phone)}</div>` : ""}
        ${addr ? `<div class="lbl-addr" style="font-size:${BASE_FS}px;font-weight:600;line-height:1.3;word-break:break-word;overflow-wrap:anywhere;padding:0 8px 4px;border-bottom:1px solid #000;">${escapeHtml(addr)}</div>` : `<div style="border-bottom:1px solid #000;"></div>`}
        <div class="lbl-items" style="padding:4px 8px;flex:1 1 auto;min-height:0;overflow:hidden;display:flex;flex-direction:column;${qrUrl ? `padding-right:${72 + 8}px;` : ""}">
          ${itemsHtml || `<div class="lbl-item" style="font-size:${BASE_FS}px;color:#000;">—</div>`}
        </div>
        ${qrUrl ? `<div style="position:absolute;right:5px;bottom:5px;background:#fff;padding:2px;border:1px solid #000;line-height:0;">
          <img src="${qrUrl}" alt="QR" style="display:block;width:72px;height:72px;image-rendering:pixelated;filter:grayscale(100%) contrast(1.2);"/>
        </div>` : ""}
      `;
      host.appendChild(card);

      // Auto-fit: shrink QR (and items font as fallback) until no overlap/overflow
      if (qrUrl) {
        const qrEl = card.querySelector<HTMLDivElement>('div[style*="position:absolute"]');
        const itemsBox = card.querySelector<HTMLDivElement>(".lbl-items");
        let qrSize = 72;
        const minQr = 44;
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
        while (!fits() && guard < 14) {
          guard++;
          if (qrSize > minQr) {
            qrSize -= 2;
            const img = qrEl?.querySelector("img") as HTMLImageElement | null;
            if (img) { img.style.width = `${qrSize}px`; img.style.height = `${qrSize}px`; }
            if (itemsBox) itemsBox.style.paddingRight = `${qrSize + 8}px`;
          } else {
            itemsBox?.querySelectorAll<HTMLElement>("div").forEach((el) => {
              const cur = parseFloat(getComputedStyle(el).fontSize) || 10;
              if (cur > 7) el.style.fontSize = `${cur - 0.5}px`;
            });
          }
        }
      }

      // Generic shrink pass: if any element overflows the card, shrink item fonts
      {
        const itemsBox = card.querySelector<HTMLDivElement>(".lbl-items");
        const overflows = (): boolean => {
          const cardRect = card.getBoundingClientRect();
          return Array.from(card.querySelectorAll<HTMLElement>("*")).some((el) => {
            const r = el.getBoundingClientRect();
            return r.right > cardRect.right + 0.5 || r.bottom > cardRect.bottom + 0.5;
          });
        };
        let g = 0;
        while (overflows() && g < 20) {
          g++;
          itemsBox?.querySelectorAll<HTMLElement>(".lbl-item").forEach((el) => {
            const cur = parseFloat(getComputedStyle(el).fontSize) || 9;
            if (cur > 6.5) el.style.fontSize = `${cur - 0.5}px`;
          });
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
