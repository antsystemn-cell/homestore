import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Package, Phone, Calendar, RotateCcw, CheckCircle2, XCircle, Clock, Trash2, Edit } from "lucide-react";

type ReturnRow = {
  id: string;
  order_ref: string | null;
  phone: string;
  customer_name: string | null;
  product_name: string;
  quantity: number;
  refund_amount: number;
  reason: string;
  condition: string;
  status: string;
  note: string | null;
  refunded_at: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Хүлээгдэж буй", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  approved: { label: "Зөвшөөрсөн", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
  refunded: { label: "Мөнгө буцаасан", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Татгалзсан", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const CONDITION_LABELS: Record<string, string> = {
  unused: "Шинэ / ашиглаагүй",
  used: "Ашигласан",
  damaged: "Гэмтэлтэй",
};

const REASON_PRESETS = [
  "Хэмжээ таарахгүй",
  "Өнгө/загвар таалагдаагүй",
  "Гэмтэлтэй ирсэн",
  "Буруу бараа ирсэн",
  "Чанар муу",
  "Бусад",
];

const emptyForm = {
  order_ref: "",
  phone: "",
  customer_name: "",
  product_name: "",
  quantity: 1,
  refund_amount: 0,
  reason: REASON_PRESETS[0],
  condition: "unused",
  status: "pending",
  note: "",
};

export default function ReturnsManager() {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_returns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Ачааллаж чадсангүй: " + error.message);
    } else {
      setRows((data || []) as ReturnRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (r.order_ref || "").toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        (r.customer_name || "").toLowerCase().includes(q) ||
        r.product_name.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const totalRefunded = rows.filter(r => r.status === "refunded").reduce((s, r) => s + (r.refund_amount || 0), 0);
    return {
      total: rows.length,
      pending: rows.filter(r => r.status === "pending").length,
      refunded: rows.filter(r => r.status === "refunded").length,
      amount: totalRefunded,
    };
  }, [rows]);

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (r: ReturnRow) => {
    setEditId(r.id);
    setForm({
      order_ref: r.order_ref || "",
      phone: r.phone,
      customer_name: r.customer_name || "",
      product_name: r.product_name,
      quantity: r.quantity,
      refund_amount: r.refund_amount,
      reason: r.reason,
      condition: r.condition,
      status: r.status,
      note: r.note || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.phone.trim() || !form.product_name.trim()) {
      toast.error("Утас болон бараа заавал");
      return;
    }
    setSaving(true);
    const payload: any = {
      order_ref: form.order_ref.trim() || null,
      phone: form.phone.trim(),
      customer_name: form.customer_name.trim() || null,
      product_name: form.product_name.trim(),
      quantity: Number(form.quantity) || 1,
      refund_amount: Number(form.refund_amount) || 0,
      reason: form.reason,
      condition: form.condition,
      status: form.status,
      note: form.note.trim() || null,
      refunded_at: form.status === "refunded" ? new Date().toISOString() : null,
    };
    const { error } = editId
      ? await supabase.from("product_returns").update(payload).eq("id", editId)
      : await supabase.from("product_returns").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Шинэчиллээ" : "Буцаалт бүртгэгдлээ");
    setOpen(false);
    load();
  };

  const quickStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "refunded") patch.refunded_at = new Date().toISOString();
    const { error } = await supabase.from("product_returns").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Статус шинэчлэгдлээ");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.from("product_returns").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Устгагдлаа");
    load();
  };

  const fmt = (n: number) => n.toLocaleString("mn-MN") + "₮";
  const fmtDate = (s: string) => new Date(s).toLocaleString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Нийт</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Хүлээгдэж буй</div><div className="text-2xl font-bold text-amber-600">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Буцаасан</div><div className="text-2xl font-bold text-emerald-600">{stats.refunded}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Нийт буцаасан</div><div className="text-lg md:text-2xl font-bold">{fmt(stats.amount)}</div></CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Захиалгын дугаар, утас, нэр, бараа..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Бүх статус</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Шинэ буцаалт</Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Ачааллаж байна...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Буцаалт олдсонгүй
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const s = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
            const Icon = s.icon;
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${s.color} border font-semibold`}><Icon className="h-3 w-3 mr-1" />{s.label}</Badge>
                        {r.order_ref && <Badge variant="outline" className="font-mono text-xs">{r.order_ref}</Badge>}
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(r.created_at)}</span>
                      </div>
                      <div className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{r.product_name} × {r.quantity}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>
                        {r.customer_name && <span>{r.customer_name}</span>}
                        <span>Төлөв: <b>{CONDITION_LABELS[r.condition] || r.condition}</b></span>
                        <span>Шалтгаан: <b>{r.reason}</b></span>
                      </div>
                      {r.note && <div className="text-xs bg-muted/50 rounded px-2 py-1 mt-1">{r.note}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2 md:min-w-[180px]">
                      <div className="text-lg font-bold text-red-600">-{fmt(r.refund_amount)}</div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {r.status !== "refunded" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-300" onClick={() => quickStatus(r.id, "refunded")}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Буцаасан
                          </Button>
                        )}
                        {r.status === "pending" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300" onClick={() => quickStatus(r.id, "rejected")}>
                            <XCircle className="h-3 w-3 mr-1" /> Татгалзах
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Буцаалт засах" : "Шинэ буцаалт бүртгэх"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Захиалгын дугаар</Label>
                <Input value={form.order_ref} onChange={e => setForm(f => ({ ...f, order_ref: e.target.value }))} placeholder="ES-XXXXXX-..." />
              </div>
              <div>
                <Label className="text-xs">Утас *</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="99112233" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Хэрэглэгчийн нэр</Label>
              <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Бараа *</Label>
              <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="Барааны нэр" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Тоо ширхэг</Label>
                <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">Буцаах дүн (₮)</Label>
                <Input type="number" min={0} value={form.refund_amount} onChange={e => setForm(f => ({ ...f, refund_amount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Барааны төлөв</Label>
                <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Статус</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Шалтгаан</Label>
              <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASON_PRESETS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Тэмдэглэл</Label>
              <Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} placeholder="Нэмэлт тайлбар..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Болих</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Хадгалж байна..." : "Хадгалах"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
