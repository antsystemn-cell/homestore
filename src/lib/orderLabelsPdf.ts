import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

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

function isPaid(o: OrderForLabel): boolean {
  const status = (o.payment_status || "").toLowerCase();
  return status === "confirmed" || status === "paid";
}

function isCashLike(o: OrderForLabel): boolean {
  const m = (o.payment_method || "cash").toLowerCase();
  return m === "cash" || m === "cod" || m === "" || m === "qpay";
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
 * 70x80mm thermal label, vector PDF (jsPDF native draw — not rasterized).
 * Clean, minimal, black-only on pure white background.
 */
export async function downloadOrderLabelsPdf(
  orders: OrderForLabel[],
  filename = `orders-${new Date().toISOString().slice(0, 10)}.pdf`
) {
  if (!orders.length) return;

  const needsQr = orders.filter((o) => !isPaid(o) && isCashLike(o) && o.id);
  const qrEntries = await Promise.all(
    needsQr.map(async (o) => [o.id, await fetchQpayQr(o.id)] as const)
  );
  const qrMap = new Map<string, string | null>(qrEntries);

  const PAGE_W = 70;
  const PAGE_H = 80;
  const MARGIN = 2;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const pdf = new jsPDF({ unit: "mm", format: [PAGE_W, PAGE_H], orientation: "portrait" });
  pdf.setTextColor(0, 0, 0);
  pdf.setDrawColor(0, 0, 0);

  // pt -> mm helper (jsPDF "pt" font sizes scale — we'll treat numbers as pt)
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");

    const orderNo = o.order_ref || `#${o.id.slice(0, 8).toUpperCase()}`;
    const phone = (o.phone || "—").trim();
    const addr = (o.shipping_address || "—").trim();
    const paid = isPaid(o);
    const qrUrl = !paid && o.id ? qrMap.get(o.id) || null : null;

    const itemsArr: OrderItemLite[] = (Array.isArray(o.items) ? (o.items as OrderItemLite[]) : []).filter((it) => it && it.name);
    const itemsText = itemsArr
      .map((it) => {
        const variant = [it.color, it.size].filter(Boolean).join(" ");
        return `${it.name}${variant ? ` - ${variant}` : ""} x${it.quantity ?? 1}`;
      })
      .join(" | ") || "—";

    let y = MARGIN;

    // 1. HEADER — order number (left) and label number (right)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(orderNo, MARGIN, y + 4);
    const labelNo = `№${i + 1}`;
    const labelNoW = pdf.getTextWidth(labelNo);
    pdf.text(labelNo, PAGE_W - MARGIN - labelNoW, y + 4);
    y += 6;
    // separator
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;

    // 2. PHONE
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110, 110, 110);
    pdf.text("УТАС", MARGIN, y + 2.5);
    y += 3.5;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(0, 0, 0);
    pdf.text(phone, MARGIN, y + 5);
    y += 8;

    // 3. ADDRESS
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110, 110, 110);
    pdf.text("ХАЯГ", MARGIN, y + 2.5);
    y += 3.5;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    // Decide product space first so address can flex
    // Reserve product section: label (3.5mm) + 2 lines (~9mm) + spacing (2mm)
    const PRODUCT_RESERVE = 16;
    const QR_SIZE = qrUrl ? 22 : 0;
    const QR_MARGIN = qrUrl ? 1 : 0;
    const productBottomLimit = PAGE_H - MARGIN - QR_SIZE - QR_MARGIN;
    const addrBottomLimit = productBottomLimit - PRODUCT_RESERVE;

    // Pick address font size that fits; try 10, 9, 8, 7
    let addrFs = 10;
    let addrLines: string[] = [];
    let addrLineH = 0;
    while (addrFs >= 7) {
      pdf.setFontSize(addrFs);
      addrLineH = addrFs * 0.4 + 0.4; // approx line height in mm (~1.35)
      addrLines = pdf.splitTextToSize(addr, CONTENT_W) as string[];
      const totalH = addrLines.length * addrLineH;
      if (y + totalH <= addrBottomLimit) break;
      addrFs -= 1;
    }
    // Final clamp: if still too tall at 7pt, truncate
    pdf.setFontSize(addrFs);
    addrLineH = addrFs * 0.4 + 0.4;
    const maxLines = Math.max(1, Math.floor((addrBottomLimit - y) / addrLineH));
    if (addrLines.length > maxLines) {
      addrLines = addrLines.slice(0, maxLines);
      // ellipsize last line
      const last = addrLines[addrLines.length - 1];
      addrLines[addrLines.length - 1] = last.replace(/.{3}$/, "...");
    }
    for (const line of addrLines) {
      pdf.text(line, MARGIN, y + addrFs * 0.35);
      y += addrLineH;
    }

    // 4. PRODUCT — anchored above QR area
    let productY = productBottomLimit - PRODUCT_RESERVE + 2;
    if (productY < y + 2) productY = y + 2;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110, 110, 110);
    pdf.text("БАРАА", MARGIN, productY + 2.5);
    productY += 3.5;

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    let prodFs = 10;
    let prodLines: string[] = [];
    while (prodFs >= 7) {
      pdf.setFontSize(prodFs);
      prodLines = pdf.splitTextToSize(itemsText, CONTENT_W - (qrUrl ? QR_SIZE + 1 : 0)) as string[];
      if (prodLines.length <= 2) break;
      prodFs -= 1;
    }
    pdf.setFontSize(prodFs);
    if (prodLines.length > 2) {
      prodLines = prodLines.slice(0, 2);
      const last = prodLines[1];
      prodLines[1] = last.replace(/.{3}$/, "...");
    }
    const prodLineH = prodFs * 0.4 + 0.4;
    for (const line of prodLines) {
      pdf.text(line, MARGIN, productY + prodFs * 0.35);
      productY += prodLineH;
    }

    // QR (bottom-right) — only for unpaid cash-like
    if (qrUrl) {
      try {
        pdf.addImage(qrUrl, "PNG", PAGE_W - MARGIN - QR_SIZE, PAGE_H - MARGIN - QR_SIZE, QR_SIZE, QR_SIZE);
      } catch {
        // ignore
      }
    }
  }

  pdf.save(filename);
}
