// Daily delivery report — queries today's deliveries (Ulaanbaatar TZ, UTC+8)
// and enqueues a summary email via the transactional_emails queue.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RECIPIENT = Deno.env.get("DAILY_REPORT_RECIPIENT") ?? "byambatseren.d@gmail.com";
const SENDER_DOMAIN = "easyshop.mn";
const FROM_ADDRESS = "EasyShop Тайлан <reports@easyshop.mn>";

const MNT = (n: number) => new Intl.NumberFormat("mn-MN").format(Math.round(n)) + "₮";

// Ulaanbaatar is UTC+8 (no DST). Return [startUtcIso, endUtcIso, ymd] for "today" in UB.
function ubDayBounds(): { startIso: string; endIso: string; label: string } {
  const now = new Date();
  const ubMs = now.getTime() + 8 * 3600 * 1000;
  const ubDate = new Date(ubMs);
  const y = ubDate.getUTCFullYear();
  const m = ubDate.getUTCMonth();
  const d = ubDate.getUTCDate();
  // UB midnight = UTC midnight - 8h
  const startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - 8 * 3600 * 1000);
  const endUtc = new Date(startUtc.getTime() + 24 * 3600 * 1000);
  const label = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { startIso: startUtc.toISOString(), endIso: endUtc.toISOString(), label };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { startIso, endIso, label } = ubDayBounds();

    // Delivered today (based on delivered_at)
    const { data: delivered, error: e1 } = await supabase
      .from("orders")
      .select("id,total,delivery_fee,delivery_surcharge,payment_method,payment_status,source")
      .gte("delivered_at", startIso)
      .lt("delivered_at", endIso);
    if (e1) throw e1;

    // Currently in-flight (out for delivery) — snapshot at report time
    const { data: delivering } = await supabase
      .from("orders")
      .select("id,total")
      .eq("status", "delivering");

    // Failed / returned today
    const { data: failed } = await supabase
      .from("orders")
      .select("id,total,delivery_return_reason")
      .gte("delivery_failed_at", startIso)
      .lt("delivery_failed_at", endIso);

    // Cancelled today
    const { data: cancelled } = await supabase
      .from("orders")
      .select("id,total")
      .eq("status", "cancelled")
      .gte("updated_at", startIso)
      .lt("updated_at", endIso);

    // Orders CREATED today (for context)
    const { data: created } = await supabase
      .from("orders")
      .select("id,total,source")
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    const sum = (arr: any[] | null, key: string) =>
      (arr ?? []).reduce((s, r) => s + Number(r?.[key] ?? 0), 0);

    const deliveredCount = delivered?.length ?? 0;
    const deliveredTotal = sum(delivered, "total");
    const deliveredFees = sum(delivered, "delivery_fee") + sum(delivered, "delivery_surcharge");
    const paidCount = (delivered ?? []).filter((o) => o.payment_status === "paid").length;
    const codCount = deliveredCount - paidCount;

    const deliveringCount = delivering?.length ?? 0;
    const deliveringTotal = sum(delivering, "total");
    const failedCount = failed?.length ?? 0;
    const cancelledCount = cancelled?.length ?? 0;

    const createdCount = created?.length ?? 0;
    const createdTotal = sum(created, "total");
    const manualCount = (created ?? []).filter((o) => o.source === "manual").length;
    const webCount = createdCount - manualCount;

    const subject = `📦 EasyShop өдрийн тайлан · ${label} · ${deliveredCount} хүргэлт · ${MNT(deliveredTotal)}`;

    const html = `
<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f6f8;padding:24px;margin:0;color:#111827">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
    <div style="border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:20px">
      <h1 style="margin:0;font-size:22px;color:#2563eb">📦 EasyShop өдрийн хүргэлтийн тайлан</h1>
      <div style="color:#6b7280;font-size:13px;margin-top:4px">${label} · Улаанбаатарын цагаар</div>
    </div>

    <h2 style="margin:0 0 12px;font-size:16px;color:#111827">✅ Амжилттай хүргэгдсэн</h2>
    <table width="100%" style="border-collapse:collapse;margin-bottom:24px;font-size:14px">
      <tr><td style="padding:8px 0;color:#6b7280">Нийт захиалга</td><td style="text-align:right;font-weight:600">${deliveredCount}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Нийт дүн</td><td style="text-align:right;font-weight:700;color:#059669;font-size:16px">${MNT(deliveredTotal)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Үүнээс хүргэлтийн төлбөр</td><td style="text-align:right">${MNT(deliveredFees)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Онлайн төлсөн</td><td style="text-align:right">${paidCount}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Бэлнээр (COD)</td><td style="text-align:right">${codCount}</td></tr>
    </table>

    <h2 style="margin:0 0 12px;font-size:16px;color:#111827">🚚 Явцын статус</h2>
    <table width="100%" style="border-collapse:collapse;margin-bottom:24px;font-size:14px">
      <tr><td style="padding:8px 0;color:#6b7280">Одоо явж буй</td><td style="text-align:right;font-weight:600">${deliveringCount} (${MNT(deliveringTotal)})</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Амжилтгүй / буцаагдсан</td><td style="text-align:right;color:#dc2626;font-weight:600">${failedCount}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Цуцлагдсан</td><td style="text-align:right;color:#dc2626">${cancelledCount}</td></tr>
    </table>

    <h2 style="margin:0 0 12px;font-size:16px;color:#111827">🆕 Өнөөдөр орсон захиалга</h2>
    <table width="100%" style="border-collapse:collapse;margin-bottom:16px;font-size:14px">
      <tr><td style="padding:8px 0;color:#6b7280">Нийт</td><td style="text-align:right;font-weight:600">${createdCount} (${MNT(createdTotal)})</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Вэбээс</td><td style="text-align:right">${webCount}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Гараар оруулсан</td><td style="text-align:right">${manualCount}</td></tr>
    </table>

    <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;font-size:12px;color:#9ca3af;text-align:center">
      Энэ тайлан өдөр бүр 21:00 цагт автоматаар илгээгддэг · EasyShop
    </div>
  </div>
</body></html>`.trim();

    const messageId = `daily-report-${label}-${Date.now()}`;
    const payload = {
      to: RECIPIENT,
      from: FROM_ADDRESS,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      purpose: "transactional" as const,
      label: "daily_delivery_report",
      message_id: messageId,
      idempotency_key: `daily-report-${label}`,
      queued_at: new Date().toISOString(),
    };

    const { error: qErr } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload,
    });
    if (qErr) throw qErr;

    return new Response(
      JSON.stringify({
        ok: true,
        label,
        recipient: RECIPIENT,
        delivered: deliveredCount,
        delivered_total: deliveredTotal,
        delivering: deliveringCount,
        failed: failedCount,
        cancelled: cancelledCount,
        created: createdCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("daily-delivery-report failed", e);
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
