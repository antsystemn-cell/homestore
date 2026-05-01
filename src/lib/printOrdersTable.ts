// Тус бүр захиалгыг A4 дээр хүснэгт хэлбэрээр хэвлэх
// Захиалга бүрд header (Phone | Product | SKU | Price | Paid | Address) давтагдана.

export type PrintField = "phone" | "product" | "sku" | "price" | "payment" | "address";

export interface PrintFieldConfig {
  key: PrintField;
  label: string;
  enabled: boolean;
}

export const DEFAULT_PRINT_FIELDS: PrintFieldConfig[] = [
  { key: "phone", label: "Утас", enabled: true },
  { key: "product", label: "Бараа", enabled: true },
  { key: "sku", label: "SKU", enabled: true },
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
    // Validate: ensure all default keys exist (in stored order)
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

function paymentLabel(o: TablePrintOrder): string {
  const status = (o.payment_status || "").toLowerCase();
  const method = (o.payment_method || "cash").toLowerCase();
  const isPaid = status === "confirmed" || status === "paid";
  const methodMap: Record<string, string> = {
    cash: "Бэлэн", cod: "Бэлэн", qpay: "QPay", storepay: "Storepay", pocket: "Pocket",
  };
  const m = methodMap[method] || method.toUpperCase();
  return isPaid ? `Төлсөн (${m})` : `Төлөөгүй (${m})`;
}

function buildRows(o: TablePrintOrder, fields: PrintFieldConfig[]): string {
  const items: OrderItem[] = Array.isArray(o.items) ? (o.items as OrderItem[]) : [];
  if (items.length === 0) {
    return `<tr>${fields.map(() => `<td>—</td>`).join("")}</tr>`;
  }
  return items
    .map((it) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      const variant = [it.color, it.size].filter(Boolean).join("/");
      const productName = `${it.name || "—"}${variant ? ` (${variant})` : ""} × ${qty}`;
      return `<tr>${fields
        .filter((f) => f.enabled)
        .map((f) => {
          switch (f.key) {
            case "phone": return `<td>${esc(o.phone || "—")}</td>`;
            case "product": return `<td>${esc(productName)}</td>`;
            case "sku": return `<td>${esc(it.product_code || it.sku || "—")}</td>`;
            case "price": return `<td class="r">${mnt(price * qty)}</td>`;
            case "payment": return `<td>${esc(paymentLabel(o))}</td>`;
            case "address": return `<td>${esc(o.shipping_address || "—")}</td>`;
          }
        })
        .join("")}</tr>`;
    })
    .join("");
}

function buildOrderBlock(o: TablePrintOrder, fields: PrintFieldConfig[], idx: number): string {
  const enabled = fields.filter((f) => f.enabled);
  const ref = o.order_ref || (o.id ? `#${o.id.slice(0, 8).toUpperCase()}` : "—");
  const date = o.created_at ? new Date(o.created_at).toLocaleString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }) : "";
  return `<section class="order-block">
    <div class="order-head">
      <span class="order-num">№ ${idx + 1}</span>
      <span class="order-ref">${esc(ref)}</span>
      ${o.guest_name ? `<span class="order-name">${esc(o.guest_name)}</span>` : ""}
      <span class="order-total">${mnt(Number(o.total) || 0)}</span>
      ${date ? `<span class="order-date">${esc(date)}</span>` : ""}
    </div>
    <table class="order-table">
      <thead>
        <tr>${enabled.map((f) => `<th>${esc(f.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>${buildRows(o, fields)}</tbody>
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
.order-total{margin-left:auto;font-weight:800;font-size:13px}
.order-date{opacity:.8;font-size:11px}
.order-table{width:100%;border-collapse:collapse;font-size:12px}
.order-table th{background:#f3f3f3;border:1px solid #999;padding:5px 7px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.3px}
.order-table td{border:1px solid #bbb;padding:5px 7px;vertical-align:top;line-height:1.35}
.order-table .r{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
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

export function printOrdersTable(orders: TablePrintOrder[], fields?: PrintFieldConfig[]): boolean {
  if (!orders?.length) return false;
  const fieldList = (fields || loadPrintFields()).filter((f) => f.enabled).length
    ? (fields || loadPrintFields())
    : DEFAULT_PRINT_FIELDS;

  const blocks = orders.map((o, i) => buildOrderBlock(o, fieldList, i)).join("");

  const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"/>
<title>${orders.length} захиалга — Хэвлэх</title>
<style>${STYLES}</style></head><body>
<div class="bar">
  <div class="info">
    <span class="t">${orders.length} захиалга</span>
    <span class="s">A4 — захиалга бүрд толгой давтагдана</span>
  </div>
  <div class="actions">
    <button class="pr" onclick="window.print()">🖨️ Хэвлэх</button>
    <button onclick="window.close()">Хаах</button>
  </div>
</div>
<div class="page"><div class="page-inner">${blocks}</div></div>
</body></html>`;

  const w = window.open("", "_blank", "width=1000,height=1100");
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
