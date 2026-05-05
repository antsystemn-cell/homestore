import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ELLE_BRAND_ID = "24c51924-70f8-453c-b6cd-7e6eccbda36e";

interface LogRow {
  id: string;
  created_at: string;
  order_ref: string | null;
  product_name: string | null;
  color: string | null;
  size: string | null;
  quantity_deducted: number;
  stock_before: number | null;
  stock_after: number | null;
}

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function StockDeductionLog() {
  const [from, setFrom] = useState<string>(daysAgoStr(7));
  const [to, setTo] = useState<string>(todayStr());
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // from 00:00 local to to 23:59:59 local
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999`).toISOString();

      const { data, error } = await supabase
        .from("stock_deduction_log")
        .select("id,created_at,order_ref,product_name,color,size,quantity_deducted,stock_before,stock_after")
        .eq("brand_id", ELLE_BRAND_ID)
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;
      setRows((data as LogRow[]) || []);
    } catch (e: any) {
      toast.error(e.message || "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + (r.quantity_deducted || 0), 0);
    const orders = new Set(rows.map((r) => r.order_ref || "").filter(Boolean)).size;
    return { totalQty, orders, count: rows.length };
  }, [rows]);

  const exportXlsx = () => {
    if (!rows.length) {
      toast.info("Өгөгдөл алга");
      return;
    }
    const data = rows.map((r) => ({
      "Огноо": new Date(r.created_at).toLocaleString("mn-MN"),
      "Захиалга": r.order_ref || "",
      "Бараа": r.product_name || "",
      "Өнгө": r.color || "",
      "Хэмжээ": r.size || "",
      "Хассан": r.quantity_deducted,
      "Өмнөх үлдэгдэл": r.stock_before ?? "",
      "Шинэ үлдэгдэл": r.stock_after ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Log");
    XLSX.writeFile(wb, `elle-sport-stock-${from}_${to}.xlsx`);
  };

  const setQuickRange = (days: number) => {
    setFrom(daysAgoStr(days));
    setTo(todayStr());
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-4 md:p-6 border border-border">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4" /> Огнооны мужаар шүүх
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Эхлэх</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Дуусах</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Шүүх"}
          </Button>
          <Button variant="outline" onClick={exportXlsx} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="ghost" onClick={() => { setFrom(todayStr()); setTo(todayStr()); }}>Өнөөдөр</Button>
          <Button size="sm" variant="ghost" onClick={() => setQuickRange(7)}>7 хоног</Button>
          <Button size="sm" variant="ghost" onClick={() => setQuickRange(30)}>30 хоног</Button>
          <Button size="sm" variant="ghost" onClick={() => setQuickRange(90)}>90 хоног</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{totals.count}</p>
          <p className="text-xs text-muted-foreground">Бичлэг</p>
        </div>
        <div className="bg-secondary rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{totals.totalQty}</p>
          <p className="text-xs text-muted-foreground">Нийт хассан ширхэг</p>
        </div>
        <div className="bg-secondary rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{totals.orders}</p>
          <p className="text-xs text-muted-foreground">Захиалгын тоо</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs">
              <tr>
                <th className="text-left p-3">Огноо</th>
                <th className="text-left p-3">Захиалга</th>
                <th className="text-left p-3">Бараа</th>
                <th className="text-left p-3">Өнгө</th>
                <th className="text-left p-3">Хэмжээ</th>
                <th className="text-right p-3">Хассан</th>
                <th className="text-right p-3">Үлдэгдэл</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Өгөгдөл олдсонгүй</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="p-3 whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString("mn-MN")}</td>
                  <td className="p-3 font-mono text-xs">{r.order_ref || "—"}</td>
                  <td className="p-3">{r.product_name || "—"}</td>
                  <td className="p-3">{r.color || "—"}</td>
                  <td className="p-3">{r.size || "—"}</td>
                  <td className="p-3 text-right font-bold">
                    <span className={r.quantity_deducted < 0 ? "text-emerald-600" : "text-destructive"}>
                      {r.quantity_deducted > 0 ? `-${r.quantity_deducted}` : `+${Math.abs(r.quantity_deducted)}`}
                    </span>
                  </td>
                  <td className="p-3 text-right text-xs text-muted-foreground">
                    {r.stock_before ?? "—"} → <strong className="text-foreground">{r.stock_after ?? "—"}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
