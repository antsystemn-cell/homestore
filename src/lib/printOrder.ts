// Захиалгын мэдээллийг хэвлэх туслах функц
// A4 цаасан дээр нэг хүргэлт эсвэл 8 хүргэлтийг (4x2 grid) багтаасан загвар

interface PrintItem {
  name?: string;
  product_code?: string;
  sku?: string;
  color?: string;
  size?: string;
  quantity?: number;
  price?: number;
}

interface PrintOrder {
  order_ref?: string | null;
  id?: string;
  guest_name?: string | null;
  phone?: string | null;
  shipping_address?: string | null;
  total?: number;
  delivery_fee?: number | null;
  source_note?: string | null;
  created_at?: string | null;
  items?: PrintItem[] | any;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const mnt = (n: number) => `${(n ?? 0).toLocaleString("mn-MN")}₮`;

// Нэг slip-ийн HTML үүсгэх (A4 4x2 grid дотор багтах хэмжээтэй)
function buildSlip(order: PrintOrder): string {
  const items: PrintItem[] = Array.isArray(order.items) ? order.items : [];
  const ref = order.order_ref || order.id?.slice(0, 8) || "—";
  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString("mn-MN", { year: "2-digit", month: "2-digit", day: "2-digit" })
    : "";

  // Багтаах ёстой тул барааны нэрийг товчилно
  const rows = items
    .slice(0, 6)
    .map((it) => {
      const qty = Number(it.quantity) || 1;
      const code = it.product_code || it.sku || "";
      const parts = [it.color, it.size].filter(Boolean).join("/");
      const meta = [code, parts].filter(Boolean).join(" · ");
      const name = (it.name || "—").length > 32 ? (it.name || "").slice(0, 32) + "…" : it.name || "—";
      return `<tr><td>${esc(name)}${meta ? `<span class="m"> ${esc(meta)}</span>` : ""}</td><td class="r">${qty}</td></tr>`;
    })
    .join("");

  const more = items.length > 6 ? `<tr><td colspan="2" class="m" style="text-align:center">+${items.length - 6} бараа…</td></tr>` : "";

  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const fee = Number(order.delivery_fee) || 0;
  const total = order.total ?? subtotal + fee;

  return `<div class="slip">
    <div class="sh">
      <div class="brand">EasyShop</div>
      <div class="ref"><b>${esc(ref)}</b>${date ? `<span class="m"> · ${esc(date)}</span>` : ""}</div>
    </div>
    <div class="who">
      <div><b>${esc(order.guest_name || "—")}</b> · ${esc(order.phone || "—")}</div>
      <div class="addr">${esc(order.shipping_address || "—")}</div>
    </div>
    <table>
      <thead><tr><th>Бараа</th><th class="r" style="width:24px">Тоо</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="2" class="m" style="text-align:center">—</td></tr>'}${more}</tbody>
    </table>
    <div class="tot">
      <span>Нийт ${items.reduce((s, it) => s + (Number(it.quantity) || 1), 0)} ширхэг</span>
      <b>${mnt(total)}</b>
    </div>
    ${order.source_note ? `<div class="note">${esc(order.source_note.slice(0, 80))}</div>` : ""}
  </div>`;
}

// Нийтлэг CSS — A4 (210x297mm), 4 мөр × 2 багана = 8 slip
const STYLES = `
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{width:210mm;margin:0;padding:0;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif,'Apple Color Emoji';color:#000;font-size:2.4mm;background:#fff;line-height:1.25;-webkit-text-size-adjust:100%;text-rendering:geometricPrecision}
@page{size:A4 portrait;margin:0}
.sheet{width:210mm;height:297mm;padding:5mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr);gap:2mm;page-break-after:always;overflow:hidden}
.sheet:last-child{page-break-after:auto}
.slip{border:1px dashed #999;border-radius:2px;padding:3mm;display:flex;flex-direction:column;overflow:hidden;height:calc((297mm - 10mm - 6mm) / 4)}
.sh{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #000;padding-bottom:0.5mm;margin-bottom:1mm;line-height:1.2}
.brand{font-size:3mm;font-weight:800;letter-spacing:-.3px}
.ref{font-size:2.2mm;text-align:right;line-height:1.2}
.ref b{font-family:'Courier New',Courier,monospace;font-size:2.6mm}
.who{font-size:2.4mm;margin-bottom:1mm;line-height:1.25}
.who .addr{color:#333;font-size:2.1mm;margin-top:0.3mm;line-height:1.2}
table{width:100%;border-collapse:collapse;margin-bottom:auto;flex:1}
th{font-size:1.8mm;text-transform:uppercase;letter-spacing:.3px;padding:0.5mm 0;text-align:left;border-bottom:1px solid #ccc;color:#666;font-weight:600;line-height:1.2}
td{padding:0.4mm 0;border-bottom:1px dotted #eee;vertical-align:top;font-size:2.2mm;line-height:1.2}
.r{text-align:right}
.m{font-size:1.8mm;color:#777;line-height:1.2}
.tot{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #000;padding-top:0.8mm;margin-top:0.8mm;font-size:2.6mm;line-height:1.2}
.tot b{font-size:2.8mm}
.note{margin-top:0.8mm;padding:0.5mm 1mm;border-left:2px solid #f59e0b;background:#fffbeb;font-size:2mm;border-radius:1px;line-height:1.2}
.actions{position:fixed;top:8px;right:8px;display:flex;gap:6px;z-index:1000}
.actions button{padding:6px 14px;border-radius:4px;border:1px solid #000;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
.actions .pr{background:#000;color:#fff}
.actions .cl{background:#fff;color:#000}
@media print{.actions{display:none!important}}
`;

function openPrintWindow(bodyHtml: string, title: string, pageCount: number, autoprint: boolean): boolean {
  const previewBar = pageCount > 0 ? `
<div class="preview-bar">
  <div class="preview-info">
    <span class="preview-title">${esc(title)}</span>
    <span class="preview-pages">${pageCount} хуудас · хуудас бүрт 8 slip</span>
  </div>
  <div class="preview-nav">
    ${Array.from({ length: pageCount }, (_, i) => `<button class="pg-btn" onclick="document.querySelectorAll('.sheet')[${i}].scrollIntoView({behavior:'smooth',block:'start'})">Хуудас ${i + 1}</button>`).join("")}
  </div>
  <div class="preview-actions">
    <button class="pr" onclick="window.print()">🖨️ Хэвлэх</button>
    <button class="cl" onclick="window.close()">Хаах</button>
  </div>
</div>` : "";

  const previewStyles = pageCount > 0 ? `
.preview-bar{position:sticky;top:0;z-index:1000;background:#1a1a2e;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-family:system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.preview-info{display:flex;flex-direction:column;gap:2px;min-width:140px}
.preview-title{font-size:13px;font-weight:700}
.preview-pages{font-size:11px;opacity:.7}
.preview-nav{display:flex;gap:4px;flex-wrap:wrap;flex:1}
.pg-btn{padding:4px 10px;border-radius:4px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-size:11px;cursor:pointer;transition:all .15s}
.pg-btn:hover{background:rgba(255,255,255,.15);border-color:#fff}
.preview-actions{display:flex;gap:6px;margin-left:auto}
.sheet{margin:12px auto;box-shadow:0 2px 12px rgba(0,0,0,.15);border:1px solid #ddd}
body{background:#e8e8e8!important}
@media print{.preview-bar{display:none!important}body{background:#fff!important}.sheet{margin:0;box-shadow:none;border:none}}
` : "";

  const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>${STYLES}${previewStyles}</style></head><body>
${pageCount > 0 ? "" : '<div class="actions"><button class="pr" onclick="window.print()">Хэвлэх</button><button class="cl" onclick="window.close()">Хаах</button></div>'}
${previewBar}
${bodyHtml}
${autoprint ? "<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))</script>" : ""}
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Pop-up зөвшөөрнө үү.");
    return false;
  }
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
    return true;
  } catch (e) {
    console.error("print window write error", e);
    try { w.close(); } catch {}
    return false;
  }
}

// Нэг захиалга хэвлэх — A4 нэг хуудас, 1 slip эхний нүдэнд
export function printOrder(order: PrintOrder): boolean {
  const ref = order.order_ref || order.id?.slice(0, 8) || "захиалга";
  const sheet = `<div class="sheet">${buildSlip(order)}</div>`;
  return openPrintWindow(sheet, ref, 0, true);
}

// Олон захиалга — Preview горимтой, A4 хуудас бүрт 8 slip (4x2)
export function printOrders(orders: PrintOrder[]): boolean {
  if (!orders?.length) return false;
  const PER_PAGE = 8;
  const sheets: string[] = [];
  for (let i = 0; i < orders.length; i += PER_PAGE) {
    const chunk = orders.slice(i, i + PER_PAGE);
    sheets.push(`<div class="sheet">${chunk.map(buildSlip).join("")}</div>`);
  }
  return openPrintWindow(sheets.join(""), `${orders.length} захиалга`, sheets.length, false);
}
