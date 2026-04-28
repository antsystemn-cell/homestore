// Захиалгын мэдээллийг хэвлэх туслах функц
// Цэвэр, минимал нэг хуудсан delivery slip загвар

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

export function printOrder(order: PrintOrder) {
  const items: PrintItem[] = Array.isArray(order.items) ? order.items : [];
  const ref = order.order_ref || order.id?.slice(0, 8) || "—";
  const date = order.created_at
    ? new Date(order.created_at).toLocaleString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

  const rows = items
    .map((it, i) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      const code = it.product_code || it.sku || "";
      const parts = [it.color, it.size].filter(Boolean).join(" / ");
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(it.name || "—")}${code ? `<br><span class="sm">${esc(code)}</span>` : ""}${parts ? `<br><span class="sm">${esc(parts)}</span>` : ""}</td>
        <td class="r">${qty}</td>
        <td class="r">${mnt(price)}</td>
        <td class="r">${mnt(price * qty)}</td>
      </tr>`;
    })
    .join("");

  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const fee = Number(order.delivery_fee) || 0;

  const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"/>
<title>${esc(ref)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,Arial,sans-serif;color:#000;font-size:11px;padding:10mm}
.hdr{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:6px;border-bottom:1.5px solid #000;margin-bottom:8px}
.brand{font-size:15px;font-weight:800;letter-spacing:-.3px}
.ref{text-align:right;font-size:10px}
.ref b{display:block;font-size:13px;font-family:monospace}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;font-size:10px}
.info div{border:1px solid #ccc;border-radius:4px;padding:6px 8px}
.info .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin-bottom:6px}
th{background:#f0f0f0;font-size:8px;text-transform:uppercase;letter-spacing:.3px;padding:4px;text-align:left;border-bottom:1px solid #000}
td{padding:4px;border-bottom:1px solid #eee;vertical-align:top;font-size:10px}
.r{text-align:right}
.sm{font-size:8px;color:#666}
.totals{width:200px;margin-left:auto;font-size:10px}
.totals .row{display:flex;justify-content:space-between;padding:2px 0}
.totals .total{border-top:1.5px solid #000;margin-top:3px;padding-top:4px;font-size:12px;font-weight:800}
.note{margin-top:6px;padding:5px 8px;border-left:2px solid #f59e0b;background:#fffbeb;font-size:9px;border-radius:2px}
.ft{margin-top:10px;text-align:center;font-size:8px;color:#999;border-top:1px dashed #ccc;padding-top:6px}
@media print{body{padding:8mm}button{display:none!important}}
.actions{position:fixed;top:8px;right:8px;display:flex;gap:6px}
.actions button{padding:6px 14px;border-radius:4px;border:1px solid #000;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
.actions .pr{background:#000;color:#fff}
.actions .cl{background:#fff;color:#000}
</style></head><body>
<div class="actions"><button class="pr" onclick="window.print()">Хэвлэх</button><button class="cl" onclick="window.close()">Хаах</button></div>
<div class="hdr"><div class="brand">EasyShop</div><div class="ref"><b>${esc(ref)}</b>${date}</div></div>
<div class="info">
<div><div class="lbl">Хүлээн авагч</div><b>${esc(order.guest_name || "—")}</b><br>${esc(order.phone || "—")}</div>
<div><div class="lbl">Хүргэх хаяг</div>${esc(order.shipping_address || "—")}</div>
</div>
<table><thead><tr><th style="width:20px">#</th><th>Бараа</th><th class="r" style="width:36px">Тоо</th><th class="r" style="width:70px">Үнэ</th><th class="r" style="width:80px">Дүн</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#999">—</td></tr>'}</tbody></table>
<div class="totals">
<div class="row"><span>Бараа:</span><span>${mnt(subtotal)}</span></div>
<div class="row"><span>Хүргэлт:</span><span>${fee > 0 ? mnt(fee) : "Үнэгүй"}</span></div>
<div class="row total"><span>Нийт:</span><span>${mnt(order.total ?? subtotal + fee)}</span></div>
</div>
${order.source_note ? `<div class="note">${esc(order.source_note)}</div>` : ""}
<div class="ft">easyshop.mn</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))</script>
</body></html>`;

  const w = window.open("", "_blank", "width=700,height=800");
  if (!w) {
    alert("Pop-up зөвшөөрнө үү.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
