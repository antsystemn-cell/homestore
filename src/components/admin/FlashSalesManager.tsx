import { useEffect, useMemo, useState } from "react";
import { Zap, Plus, Trash2, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invalidateFlashSales } from "@/hooks/useFlashSales";

type Row = {
  id: string;
  product_id: string;
  sale_price: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
};

type ProductOpt = { id: string; name: string; price: number };

function toLocalInput(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FlashSalesManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(() => ({
    product_id: "",
    sale_price: 0,
    starts_at: toLocalInput(new Date()),
    ends_at: toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  }));

  const load = async () => {
    setLoading(true);
    const [{ data: fsRows, error: e1 }, { data: prodRows, error: e2 }] = await Promise.all([
      supabase.from("flash_sales" as any).select("*").order("ends_at", { ascending: false }).limit(500),
      supabase.from("products").select("id, name, price").eq("is_active", true).order("name"),
    ]);
    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);
    setRows((fsRows as any as Row[]) || []);
    setProducts((prodRows as any as ProductOpt[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const submit = async () => {
    if (!form.product_id) return toast.error("Бараа сонгоно уу");
    if (!form.sale_price || form.sale_price <= 0) return toast.error("Хямдралтай үнэ 0-с их");
    const starts = new Date(form.starts_at);
    const ends = new Date(form.ends_at);
    if (!(ends > starts)) return toast.error("Дуусах хугацаа эхлэхээс хойш байх ёстой");
    setSaving(true);
    const { error } = await supabase.from("flash_sales" as any).insert({
      product_id: form.product_id,
      sale_price: form.sale_price,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      is_active: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Flash sale нэмлээ");
    setForm({ ...form, product_id: "", sale_price: 0 });
    invalidateFlashSales();
    load();
  };

  const toggle = async (r: Row) => {
    const { error } = await supabase.from("flash_sales" as any).update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    invalidateFlashSales();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.from("flash_sales" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Устгалаа");
    invalidateFlashSales();
    load();
  };

  const now = Date.now();
  const statusOf = (r: Row) => {
    if (!r.is_active) return { label: "Идэвхгүй", cls: "bg-muted text-muted-foreground" };
    if (new Date(r.starts_at).getTime() > now) return { label: "Хүлээгдэж", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
    if (new Date(r.ends_at).getTime() <= now) return { label: "Дууссан", cls: "bg-muted text-muted-foreground" };
    return { label: "Идэвхтэй", cls: "bg-destructive/15 text-destructive" };
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const p = productMap.get(r.product_id);
    return (p?.name || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-destructive fill-destructive" />
          <h2 className="text-base font-bold">Шинэ Flash Sale нэмэх</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Бараа</label>
            <select
              className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
              value={form.product_id}
              onChange={(e) => {
                const pid = e.target.value;
                const p = productMap.get(pid);
                setForm({ ...form, product_id: pid, sale_price: p ? Math.round(Number(p.price) * 0.7) : 0 });
              }}
            >
              <option value="">-- сонгох --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({formatPrice(p.price)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Хямдарсан үнэ (₮)</label>
            <Input
              type="number"
              value={form.sale_price || ""}
              onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Эхлэх</label>
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Дуусах</label>
            <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex items-end">
            <Button onClick={submit} disabled={saving} className="w-full md:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Нэмэх
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <Input placeholder="Барааны нэрээр хайх..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Flash sale алга байна</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => {
              const p = productMap.get(r.product_id);
              const st = statusOf(r);
              return (
                <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p?.name || r.product_id}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                      <span className="line-through">{p ? formatPrice(p.price) : "—"}</span>
                      <span className="text-destructive font-bold">{formatPrice(r.sale_price)}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(r.starts_at).toLocaleString("mn-MN")} → {new Date(r.ends_at).toLocaleString("mn-MN")}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${st.cls}`}>{st.label}</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggle(r)}>
                      {r.is_active ? "Идэвхгүй" : "Идэвхжүүл"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
