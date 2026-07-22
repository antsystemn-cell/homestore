import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2, Package, Truck, Flag, XCircle, CircleDot, Loader2 } from "lucide-react";

interface HistoryRow {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_email: string | null;
  note: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Захиалга авсан",
  confirmed: "Төлбөр орсон / Баталгаажсан",
  preparing: "Захиалга бэлдэж байна",
  delivering: "Хүргэлтэнд гарлаа",
  completed: "Дууссан",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

const STATUS_META: Record<string, { icon: any; color: string; ring: string }> = {
  pending:    { icon: Clock,         color: "text-amber-600 bg-amber-500/10",     ring: "ring-amber-500/30" },
  confirmed:  { icon: CheckCircle2,  color: "text-emerald-600 bg-emerald-500/10", ring: "ring-emerald-500/30" },
  preparing:  { icon: Package,       color: "text-blue-600 bg-blue-500/10",       ring: "ring-blue-500/30" },
  delivering: { icon: Truck,         color: "text-violet-600 bg-violet-500/10",   ring: "ring-violet-500/30" },
  delivered:  { icon: Flag,          color: "text-green-600 bg-green-500/10",     ring: "ring-green-500/30" },
  completed:  { icon: Flag,          color: "text-green-600 bg-green-500/10",     ring: "ring-green-500/30" },
  cancelled:  { icon: XCircle,       color: "text-red-600 bg-red-500/10",         ring: "ring-red-500/30" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const humanizeGap = (ms: number) => {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} сек`;
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return mm ? `${h}ц ${mm}м` : `${h}ц`;
  const days = Math.floor(h / 24);
  const hh = h % 24;
  return hh ? `${days}ө ${hh}ц` : `${days}ө`;
};

interface Props {
  orderId: string;
  currentStatus: string;
}

export default function OrderStatusTimeline({ orderId, currentStatus }: Props) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("order_status_history")
        .select("id, from_status, to_status, changed_by_email, note, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (!error) setRows((data as HistoryRow[]) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Түүх ачааллаж байна...
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">Статусын түүх алга.</div>
    );
  }

  // Group by date, newest first
  const grouped: Record<string, HistoryRow[]> = {};
  const ordered = [...rows].reverse();
  for (const r of ordered) {
    const key = fmtDate(new Date(r.created_at));
    (grouped[key] ||= []).push(r);
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/40 border-b border-border">
        <span className="text-xs font-bold text-muted-foreground">Статусын түүх</span>
        <span className="text-[10px] text-muted-foreground">Одоогийн: <b className="text-foreground">{STATUS_LABELS[currentStatus] || currentStatus}</b></span>
      </div>

      <div className="p-4">
        {Object.entries(grouped).map(([date, list]) => (
          <div key={date} className="mb-4 last:mb-0">
            <div className="text-[11px] font-bold text-muted-foreground bg-secondary/50 rounded-md px-2.5 py-1 inline-block mb-3">
              {date}
            </div>
            <div className="relative pl-6">
              {/* vertical line */}
              <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
              {list.map((r, idx) => {
                const meta = STATUS_META[r.to_status] || { icon: CircleDot, color: "text-muted-foreground bg-secondary", ring: "ring-border" };
                const Icon = meta.icon;
                const d = new Date(r.created_at);
                const isLatest = idx === 0 && date === Object.keys(grouped)[0];
                // gap to previous (older) event
                const olderIdx = ordered.indexOf(r) + 1;
                const older = ordered[olderIdx];
                const gapMs = older ? d.getTime() - new Date(older.created_at).getTime() : 0;

                return (
                  <div key={r.id} className="relative pb-4 last:pb-0">
                    <div className={`absolute -left-6 top-0.5 h-5 w-5 rounded-full flex items-center justify-center ${meta.color} ${isLatest ? `ring-4 ${meta.ring}` : ""}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{fmtTime(d)}</span>
                      <span className={`text-xs font-bold ${isLatest ? "text-foreground" : "text-foreground/80"}`}>
                        {STATUS_LABELS[r.to_status] || r.to_status}
                      </span>
                      {r.from_status && (
                        <span className="text-[10px] text-muted-foreground">
                          ({STATUS_LABELS[r.from_status] || r.from_status} → {STATUS_LABELS[r.to_status] || r.to_status})
                        </span>
                      )}
                      {gapMs > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">
                          +{humanizeGap(gapMs)}
                        </span>
                      )}
                    </div>
                    {(r.changed_by_email || r.note) && (
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                        {r.changed_by_email && <span>👤 {r.changed_by_email}</span>}
                        {r.note && <span className="italic">📝 {r.note}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
