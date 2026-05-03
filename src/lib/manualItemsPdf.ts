import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatPrice } from "@/data/products";

export interface ManualItemForPdf {
  name: string;
  price: number;
  quantity: number;
  product_code?: string;
  image?: string;
  is_custom?: boolean;
}

/**
 * Generate a PDF where each item occupies one 70x80mm portrait page.
 * (User spec: "80x70 хэмжээтэй босоогоор" — vertical/portrait label.)
 */
export async function downloadManualItemsPdf(
  items: ManualItemForPdf[],
  filename = `items-${new Date().toISOString().slice(0, 10)}.pdf`
) {
  if (!items.length) return;

  // 70mm wide x 80mm tall = portrait
  const PAGE_W = 70;
  const PAGE_H = 80;
  const pdf = new jsPDF({ unit: "mm", format: [PAGE_W, PAGE_H], orientation: "portrait" });

  // Offscreen container
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  document.body.appendChild(host);

  try {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // Build the label HTML — sized at 70x80mm using mm units; html2canvas will rasterize.
      // Use ~3.78 px/mm at scale=4 for crisp output → element px size = mm * 3.78.
      const PX_PER_MM = 3.78;
      const wPx = Math.round(PAGE_W * PX_PER_MM);
      const hPx = Math.round(PAGE_H * PX_PER_MM);

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
        gap: 6px;
      `;

      // Image area
      if (it.image) {
        const imgWrap = document.createElement("div");
        imgWrap.style.cssText = `
          width: 100%;
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          border-radius: 4px;
          overflow: hidden;
        `;
        const img = document.createElement("img");
        img.src = it.image;
        img.crossOrigin = "anonymous";
        img.style.cssText = "max-width: 100%; max-height: 100%; object-fit: contain;";
        imgWrap.appendChild(img);
        card.appendChild(imgWrap);

        // Wait for the image to load (or fail)
        await new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }

      // Text block
      const text = document.createElement("div");
      text.style.cssText = "display: flex; flex-direction: column; gap: 2px;";
      text.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; line-height: 1.2; word-break: break-word; max-height: 36px; overflow: hidden;">
          ${escapeHtml(it.name)}
        </div>
        ${it.product_code ? `<div style="font-size: 9px; color: #555;">SKU: ${escapeHtml(it.product_code)}</div>` : ""}
        <div style="display:flex; justify-content: space-between; align-items: baseline; margin-top: 2px;">
          <div style="font-size: 12px; font-weight: 800;">${escapeHtml(formatPrice(it.price))}</div>
          <div style="font-size: 10px; font-weight: 600;">× ${it.quantity}</div>
        </div>
      `;
      card.appendChild(text);

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
