// Тус бүр захиалгыг A4 дээр хүснэгт хэлбэрээр хэвлэх
// - Захиалга бүрд header (Phone | Product | SKU | Price | Paid | Address) давтагдана
// - Нэг захиалгын Утас, Хаяг, Төлбөр баганыг ЗӨВХӨН ЭХНИЙ МӨРӨНД (rowspan) гаргана
// - Төлөгдсөн бол Төлбөр баганыг тухайн захиалгад нуух
// - Төлөгдөөгүй (Cash/COD) бол QPay invoice үүсгэж QR-г Төлбөр нүдэнд оруулна

import { supabase } from "@/integrations/supabase/client";

export type PrintField = "phone" | "product" | "sku" | "price" | "payment" | "address";

export interface PrintFieldConfig {
  key: PrintField;
  label: string;
  enabled: boolean;
}

export const DEFAULT_PRINT_FIELDS: PrintFieldConfig[] = [
  { key: "phone", label: "Утас", enabled: true },
  { key: "product", label: "Бараа", enabled: true },
  { key: "price", label: "Үнэ", enabled: true },
  { key: "payment", label: "Төлбөр", enabled: true },
  { key: "address", label: "Хаяг", enabled: true },
];

const PRINT_FIELDS_KEY = "admin_print_fields_v1";

export function loadPrintFields(): PrintFieldConfig[] {
  if (typeof window === "undefined") return DEFAULT_PRINT_FIELDS;
  try {
    const raw = localStorage.getItem(PRINT_FIELDS_KEY);
    if (!raw) return DEFAULT_PRINT_FIELDS;
    const parsed = JSON.parse(raw) as PrintFieldConfig[];
    const known = new Map(DEFAULT_PRINT_FIELDS.map((f) => [f.key, f]));
    const result: PrintFieldConfig[] = [];
    const seen = new Set<string>();
    for (const f of parsed) {
      const def = known.get(f.key);
      if (def) {
        result.push({ key: f.key, label: def.label, enabled: !!f.enabled });
        seen.add(f.key);
      }
    }
    for (const def of DEFAULT_PRINT_FIELDS) {
      if (!seen.has(def.key)) result.push({ ...def });
    }
    return result;
  } catch {
    return DEFAULT_PRINT_FIELDS;
  }
}

export function savePrintFields(fields: PrintFieldConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRINT_FIELDS_KEY, JSON.stringify(fields));
  } catch {}
}

interface OrderItem {
  name?: string;
  product_code?: string;
  sku?: string;
  color?: string;
  size?: string;
  quantity?: number;
  price?: number;
}

export interface TablePrintOrder {
  id?: string;
  order_ref?: string | null;
  guest_name?: string | null;
  phone?: string | null;
  shipping_address?: string | null;
  total?: number;
  payment_method?: string | null;
  payment_status?: string | null;
  items?: OrderItem[] | unknown;
  created_at?: string | null;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const mnt = (n: number) => `${(n ?? 0).toLocaleString("mn-MN")}₮`;

function isPaid(o: TablePrintOrder): boolean {
  const status = (o.payment_status || "").toLowerCase();
  return status === "confirmed" || status === "paid";
}

function isCashLike(o: TablePrintOrder): boolean {
  const m = (o.payment_method || "cash").toLowerCase();
  return m === "cash" || m === "cod" || m === "" || m === "qpay";
}

function paymentLabel(o: TablePrintOrder): string {
  const method = (o.payment_method || "cash").toLowerCase();
  const methodMap: Record<string, string> = {
    cash: "Бэлэн", cod: "Бэлэн", qpay: "QPay", storepay: "Storepay", pocket: "Pocket",
  };
  const m = methodMap[method] || method.toUpperCase();
  return isPaid(o) ? `Төлсөн (${m})` : `Төлөөгүй (${m})`;
}

// QPay invoice татах — алдаа гарвал null
async function fetchQpayQr(orderId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("qpay", {
      body: { action: "print-invoice", orderId },
    });
    if (error || !data?.qrImage) {
      console.warn("QPay print-invoice failed for order", orderId, error || data);
      return null;
    }
    // qr_image нь base64 (no data: prefix). data: URL болгоно
    const qr: string = data.qrImage;
    return qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
  } catch (e) {
    console.warn("QPay invoke error", e);
    return null;
  }
}

interface OrderRenderContext {
  qrDataUrl: string | null;
  hidePayment: boolean; // Төлсөн бол true
}

function buildRows(
  o: TablePrintOrder,
  fields: PrintFieldConfig[],
  ctx: OrderRenderContext
): string {
  const items: OrderItem[] = Array.isArray(o.items) ? (o.items as OrderItem[]) : [];
  const list = items.length ? items : ([{ name: "—", quantity: 1, price: 0 }] as OrderItem[]);
  const hiddenWhenPaid: PrintField[] = ["payment", "price"];
  const enabled = fields.filter((f) => f.enabled && !(ctx.hidePayment && hiddenWhenPaid.includes(f.key)));

  // Нэг захиалгын бүх барааг нэг нүдэнд нэгтгэнэ
  const productCell = list
    .map((it) => {
      const qty = Number(it.quantity) || 1;
      const variant = [it.color, it.size].filter(Boolean).join("/");
      const sku = it.product_code || it.sku || "";
      const skuPart = sku ? ` - ${sku}` : "";
      return `${it.name || "—"}${variant ? ` (${variant})` : ""}${skuPart} × ${qty}`;
    })
    .join(" | ");

  const skuCell = list
    .map((it) => it.product_code || it.sku || "—")
    .join(" | ");

  const totalPrice = list.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );

  return `<tr>${enabled
    .map((f) => {
      switch (f.key) {
        case "phone":
          return `<td class="shared">${esc(o.phone || "—")}</td>`;
        case "address":
          return `<td class="shared">${esc(o.shipping_address || "—")}</td>`;
        case "payment": {
          if (ctx.qrDataUrl) {
            return `<td class="shared pay-cell">
              <div class="pay-text">${esc(paymentLabel(o))}</div>
              <div class="pay-amount">${mnt(Number(o.total) || 0)}</div>
              <img class="qr" src="${ctx.qrDataUrl}" alt="QPay QR"/>
              <div class="qr-hint">QPay-аар скан хийнэ үү</div>
            </td>`;
          }
          return `<td class="shared">${esc(paymentLabel(o))}</td>`;
        }
        case "product":
          return `<td>${esc(productCell)}</td>`;
        case "sku":
          return `<td>${esc(skuCell)}</td>`;
        case "price":
          return `<td class="r">${mnt(totalPrice)}</td>`;
      }
      return "";
    })
    .join("")}</tr>`;
}

function buildOrderBlock(
  o: TablePrintOrder,
  fields: PrintFieldConfig[],
  idx: number,
  ctx: OrderRenderContext
): string {
  const hiddenWhenPaid: PrintField[] = ["payment", "price"];
  const enabled = fields.filter((f) => f.enabled && !(ctx.hidePayment && hiddenWhenPaid.includes(f.key)));
  const ref = o.order_ref || (o.id ? `#${o.id.slice(0, 8).toUpperCase()}` : "—");
  const date = o.created_at ? new Date(o.created_at).toLocaleString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }) : "";
  const paidBadge = ctx.hidePayment ? `<span class="paid-badge">ТӨЛСӨН</span>` : "";
  return `<section class="order-block">
    <div class="order-head">
      <span class="order-num">№ ${idx + 1}</span>
      <span class="order-ref">${esc(ref)}</span>
      ${o.guest_name ? `<span class="order-name">${esc(o.guest_name)}</span>` : ""}
      ${paidBadge}
      <span class="order-total">${mnt(Number(o.total) || 0)}</span>
      ${date ? `<span class="order-date">${esc(date)}</span>` : ""}
    </div>
    <table class="order-table">
      <thead>
        <tr>${enabled.map((f) => `<th>${esc(f.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>${buildRows(o, fields, ctx)}</tbody>
    </table>
  </section>`;
}

const STYLES = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,'Noto Sans',sans-serif;color:#000;background:#e8e8e8}
@page{size:A4 portrait;margin:10mm}
.page{width:190mm;margin:8mm auto;padding:0;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.12);min-height:277mm}
.page-inner{padding:6mm}
.order-block{border:1.5px solid #000;border-radius:3px;margin-bottom:5mm;page-break-inside:avoid;break-inside:avoid}
.order-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#000;color:#fff;padding:5px 9px;font-size:12px;font-weight:600}
.order-num{background:#fff;color:#000;padding:1px 8px;border-radius:3px;font-weight:700}
.order-ref{font-family:'Courier New',monospace;font-weight:700}
.order-name{opacity:.95}
.paid-badge{background:#16a34a;color:#fff;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:.5px}
.order-total{margin-left:auto;font-weight:800;font-size:13px}
.order-date{opacity:.8;font-size:11px}
.order-table{width:100%;border-collapse:collapse;font-size:12px;table-layout:auto}
.order-table th{background:#f3f3f3;border:1px solid #999;padding:5px 7px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.3px}
.order-table td{border:1px solid #bbb;padding:5px 7px;vertical-align:middle;line-height:1.35}
.order-table td.shared{background:#fafafa;vertical-align:middle;text-align:center}
.order-table .r{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.pay-cell{text-align:center}
.pay-text{font-weight:600;font-size:11px;margin-bottom:2px}
.pay-amount{font-weight:800;font-size:13px;margin-bottom:3px}
.qr{display:block;width:80px;height:80px;margin:2px auto 0;image-rendering:pixelated}
.qr-hint{font-size:9px;color:#555;margin-top:2px;font-weight:500}
.bar{position:sticky;top:0;z-index:1000;background:#1a1a2e;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,.3);font-family:system-ui,sans-serif}
.bar .info{display:flex;flex-direction:column;line-height:1.25}
.bar .t{font-size:13px;font-weight:700}
.bar .s{font-size:11px;opacity:.75}
.bar .actions{margin-left:auto;display:flex;gap:8px}
.bar button{padding:7px 14px;border-radius:4px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.bar button.pr{background:#fff;color:#000;border-color:#fff}
@media print{
  body{background:#fff}
  .bar{display:none!important}
  .page{margin:0;padding:0;box-shadow:none;width:auto;min-height:0}
  .page-inner{padding:0}
  .order-block{margin-bottom:4mm}
}
`;

export async function printOrdersTable(
  orders: TablePrintOrder[],
  fields?: PrintFieldConfig[]
): Promise<boolean> {
  if (!orders?.length) return false;
  const fieldList = (fields || loadPrintFields()).filter((f) => f.enabled).length
    ? (fields || loadPrintFields())
    : DEFAULT_PRINT_FIELDS;

  // Pop-up-г шууд нээж "Бэлдэж байна" харуулна (browser-ууд async pop-up-г блок хийдэг)
  const w = window.open("", "_blank", "width=1000,height=1100");
  if (!w) {
    alert("Pop-up зөвшөөрнө үү.");
    return false;
  }
  try {
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Бэлдэж байна…</title>
      <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:#fff;font-size:16px}</style>
      </head><body>QPay нэхэмжлэлүүдийг бэлдэж байна… (${orders.length} захиалга)</body></html>`);
    w.document.close();
  } catch {}

  // Төлөгдөөгүй захиалгуудад QR татна (параллел)
  const needsQr = orders.filter((o) => !isPaid(o) && isCashLike(o) && o.id);
  const qrEntries = await Promise.all(
    needsQr.map(async (o) => [o.id!, await fetchQpayQr(o.id!)] as const)
  );
  const qrMap = new Map<string, string | null>(qrEntries);

  const blocks = orders
    .map((o, i) => {
      const ctx: OrderRenderContext = {
        hidePayment: isPaid(o),
        qrDataUrl: o.id ? qrMap.get(o.id) || null : null,
      };
      return buildOrderBlock(o, fieldList, i, ctx);
    })
    .join("");

  const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"/>
<title>${orders.length} захиалга — Хэвлэх</title>
<style>${STYLES}</style></head><body>
<div class="bar">
  <div class="info">
    <span class="t">${orders.length} захиалга</span>
    <span class="s">A4 — захиалга бүрд толгой давтагдана. Төлөгдөөгүйд QPay QR орсон.</span>
  </div>
  <div class="actions">
    <button class="pr" onclick="window.print()">🖨️ Хэвлэх</button>
    <button onclick="window.close()">Хаах</button>
  </div>
</div>
<div class="page"><div class="page-inner">${blocks}</div></div>
</body></html>`;

  try {
    // Blob URL-аар бүх HTML-г бүрэн навигаци хийж ачааллана — document.write дахин хийхгүй
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    w.location.replace(blobUrl);
    // Цэвэрлэгээ — хуудас ачаалсны дараа URL-г чөлөөлнө
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    try { w.focus(); } catch {}
    return true;
  } catch (e) {
    console.error(e);
    try { w.close(); } catch {}
    return false;
  }
}

// Excel export — сонгосон захиалгуудыг хэрэглэгчийн хүссэн баганаар
export function buildSelectedOrdersXlsxRows(orders: TablePrintOrder[], fields: PrintFieldConfig[]): Record<string, string | number>[] {
  const enabled = fields.filter((f) => f.enabled);
  const rows: Record<string, string | number>[] = [];
  for (const o of orders) {
    const items: OrderItem[] = Array.isArray(o.items) ? (o.items as OrderItem[]) : [];
    const list = items.length ? items : [{ name: "—", quantity: 1, price: 0 } as OrderItem];
    for (const it of list) {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      const variant = [it.color, it.size].filter(Boolean).join("/");
      const row: Record<string, string | number> = {};
      for (const f of enabled) {
        switch (f.key) {
          case "phone": row[f.label] = o.phone || ""; break;
          case "product": row[f.label] = `${it.name || ""}${variant ? ` (${variant})` : ""} × ${qty}`; break;
          case "sku": row[f.label] = it.product_code || it.sku || ""; break;
          case "price": row[f.label] = price * qty; break;
          case "payment": row[f.label] = paymentLabel(o); break;
          case "address": row[f.label] = o.shipping_address || ""; break;
        }
      }
      rows.push(row);
    }
  }
  return rows;
}
