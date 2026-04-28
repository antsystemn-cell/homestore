// Захиалгын мэдээллийг хэвлэх туслах функц
// Шинэ цонх нээж, цэвэрхэн загвартай нэхэмжлэх/баримт хэвлэдэг.

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
  status?: string | null;
  total?: number;
  delivery_fee?: number | null;
  payment_method?: string | null;
  source_note?: string | null;
  created_at?: string | null;
  items?: PrintItem[] | any;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const formatMnt = (n: number) => `${(n ?? 0).toLocaleString("mn-MN")}₮`;

export function printOrder(order: PrintOrder) {
  const items: PrintItem[] = Array.isArray(order.items) ? order.items : [];
  const ref = order.order_ref || order.id?.slice(0, 8) || "—";
  const date = order.created_at
    ? new Date(order.created_at).toLocaleString("mn-MN", { dateStyle: "short", timeStyle: "short" })
    : "";

  const itemsHtml = items
    .map((it, i) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      const code = it.product_code || it.sku || "";
      const variant = [it.color, it.size].filter(Boolean).join(" / ");
      return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div class="name">${escapeHtml(it.name || "—")}</div>
            ${code ? `<div class="meta">SKU: ${escapeHtml(code)}</div>` : ""}
            ${variant ? `<div class="meta">${escapeHtml(variant)}</div>` : ""}
          </td>
          <td class="num">${qty}</td>
          <td class="num">${formatMnt(price)}</td>
          <td class="num">${formatMnt(price * qty)}</td>
        </tr>`;
    })
    .join("");

  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const fee = Number(order.delivery_fee) || 0;

  const html = `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8" />
<title>Захиалга ${escapeHtml(ref)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Montserrat', system-ui, -apple-system, Arial, sans-serif; color: #111; margin: 24px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .brand .sub { display: block; font-size: 11px; font-weight: 500; color: #666; margin-top: 2px; }
  .ref { text-align: right; }
  .ref .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .ref .val { font-size: 16px; font-weight: 700; font-family: ui-monospace, monospace; }
  .ref .date { font-size: 11px; color: #444; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
  .card h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; font-weight: 600; }
  .card p { margin: 2px 0; }
  .card .big { font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #eee; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .name { font-weight: 600; }
  .meta { font-size: 10px; color: #666; margin-top: 2px; }
  .totals { margin-top: 12px; margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .row.total { border-top: 2px solid #111; margin-top: 6px; padding-top: 8px; font-size: 14px; font-weight: 800; }
  .note { margin-top: 16px; padding: 10px 12px; background: #fff8e1; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 11px; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #888; border-top: 1px dashed #ccc; padding-top: 12px; }
  @media print {
    body { margin: 12mm; }
    .no-print { display: none; }
  }
  .actions { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; }
  .actions button { padding: 8px 16px; border-radius: 6px; border: 1px solid #111; background: #111; color: #fff; font-weight: 600; cursor: pointer; font-family: inherit; }
  .actions button.secondary { background: #fff; color: #111; }
</style>
</head>
<body>
  <div class="actions no-print">
    <button onclick="window.print()">🖨️ Хэвлэх</button>
    <button class="secondary" onclick="window.close()">Хаах</button>
  </div>

  <div class="header">
    <div class="brand">EasyShop<span class="sub">easyshop.mn · Захиалгын баримт</span></div>
    <div class="ref">
      <div class="label">Лавлах дугаар</div>
      <div class="val">${escapeHtml(ref)}</div>
      ${date ? `<div class="date">${escapeHtml(date)}</div>` : ""}
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Хүлээн авагч</h3>
      <p class="big">${escapeHtml(order.guest_name || "—")}</p>
      <p>📞 ${escapeHtml(order.phone || "—")}</p>
    </div>
    <div class="card">
      <h3>Хүргэх хаяг</h3>
      <p>${escapeHtml(order.shipping_address || "—")}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Бараа</th>
        <th class="num" style="width:50px">Тоо</th>
        <th class="num" style="width:90px">Үнэ</th>
        <th class="num" style="width:100px">Дүн</th>
      </tr>
    </thead>
    <tbody>${itemsHtml || `<tr><td colspan="5" style="text-align:center;color:#888">Бараа байхгүй</td></tr>`}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Барааны дүн:</span><span>${formatMnt(subtotal)}</span></div>
    <div class="row"><span>Хүргэлт:</span><span>${fee > 0 ? formatMnt(fee) : "Үнэгүй"}</span></div>
    <div class="row total"><span>Нийт:</span><span>${formatMnt(order.total ?? subtotal + fee)}</span></div>
  </div>

  ${order.source_note ? `<div class="note"><strong>Тэмдэглэл:</strong> ${escapeHtml(order.source_note)}</div>` : ""}

  <div class="footer">
    Баярлалаа! · easyshop.mn · Асуудал гарвал манай Messenger руу хандана уу
  </div>

  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 250));
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) {
    alert("Хэвлэх цонх нээгдсэнгүй. Pop-up зөвшөөрнө үү.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
