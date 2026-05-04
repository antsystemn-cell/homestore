import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

import { registerDejaVuFont } from "./pdfFonts";
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

  const pdf = new jsPDF({ unit: "mm", format: [PAGE_W, PAGE_H], orientation: "portrait", putOnlyUsedFonts: true });
  let fontFamily = "helvetica";
  try {
    await registerDejaVuFont(pdf);
    fontFamily = "DejaVuSans";
  } catch (e) {
    console.error("[orderLabelsPdf] DejaVu font load failed, falling back to helvetica", e);
  }
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
    pdf.setFont(fontFamily, "bold");
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
    pdf.setFont(fontFamily, "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110, 110, 110);
    pdf.text("УТАС", MARGIN, y + 2.5);
    y += 3.5;
    pdf.setFont(fontFamily, "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(0, 0, 0);
    pdf.text(phone, MARGIN, y + 5);
    y += 8;

    // Available vertical space for address + product
    const QR_SIZE = qrUrl ? 22 : 0;
    const QR_GAP = qrUrl ? 1 : 0;
    const bottomLimit = PAGE_H - MARGIN - QR_SIZE - QR_GAP;
    const productAreaW = CONTENT_W - (qrUrl ? QR_SIZE + 1 : 0);

    // Pre-compute product layout (priority section). Try sizes 9 -> 7.
    let prodFs = 9;
    let prodLines: string[] = [];
    let prodLineH = 0;
    for (let fs = 9; fs >= 7; fs--) {
      pdf.setFont(fontFamily, "bold");
      pdf.setFontSize(fs);
      const lines = pdf.splitTextToSize(itemsText, productAreaW) as string[];
      const lh = fs * 0.38 + 0.3; // tight line-height ~1.2
      prodFs = fs;
      prodLines = lines;
      prodLineH = lh;
      if (lines.length <= 5) break;
    }
    const productBlockH = 3.5 /*label*/ + prodLines.length * prodLineH + 1;

    // 3. ADDRESS — flex grow, fills space between phone and product block
    pdf.setFont(fontFamily, "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110, 110, 110);
    pdf.text("ХАЯГ", MARGIN, y + 2.5);
    y += 3.5;
    pdf.setTextColor(0, 0, 0);

    const addrBottomLimit = bottomLimit - productBlockH - 1;
    let addrFs = 9;
    let addrLines: string[] = [];
    let addrLineH = 0;
    for (let fs = 9; fs >= 7; fs--) {
      pdf.setFont(fontFamily, "normal");
      pdf.setFontSize(fs);
      const lh = fs * 0.42 + 0.3; // ~1.3
      const lines = pdf.splitTextToSize(addr, CONTENT_W) as string[];
      addrFs = fs;
      addrLines = lines;
      addrLineH = lh;
      if (y + lines.length * lh <= addrBottomLimit) break;
    }
    pdf.setFont(fontFamily, "normal");
    pdf.setFontSize(addrFs);
    for (const line of addrLines) {
      pdf.text(line, MARGIN, y + addrFs * 0.35);
      y += addrLineH;
    }

    // 4. PRODUCT — anchored at bottom of available area
    let productY = bottomLimit - (prodLines.length * prodLineH + 3.5 + 1);
    if (productY < y + 1) productY = y + 1;

    pdf.setFont(fontFamily, "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(110, 110, 110);
    pdf.text("БАРАА", MARGIN, productY + 2.5);
    productY += 3.5;

    pdf.setFont(fontFamily, "bold");
    pdf.setFontSize(prodFs);
    pdf.setTextColor(0, 0, 0);
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
