import { useEffect, useState } from "react";
import { Gift, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  credit_type: string;
  value_type: "fixed" | "percent";
  value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  status: string;
  expires_at: string | null;
  used_at: string | null;
  order_id: string | null;
  note: string | null;
  created_at: string;
};

type UserOpt = { user_id: string; full_name: string | null; email: string | null };

export default function WalletCreditsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [form, setForm] = useState({
    user_id: "",
    value_type: "fixed" as "fixed" | "percent",
    value: 10000,
    min_order_amount: 0,
    max_discount_amount: 0,
    expires_in_days: 30,
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "used" | "expired">("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: rows }, { data: usersData }] = await Promise.all([
      supabase.rpc("admin_list_wallet_credits" as any, { _limit: 500 }),
      supabase.rpc("admin_list_users" as any),
    ]);
    setRows((rows as Row[]) || []);
    setUsers(((usersData as any[]) || []).map((u) => ({ user_id: u.user_id, full_name: u.full_name, email: u.email })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.user_id) return toast.error("Хэрэглэгчээ сонгоно уу");
    if (!form.value || form.value <= 0) return toast.error("Дүн заавал 0-с их");
    setSaving(true);
    const { error } = await supabase.rpc("admin_grant_wallet_credit" as any, {
      _user_id: form.user_id,
      _value_type: form.value_type,
      _value: form.value,
      _min_order_amount: form.min_order_amount,
      _max_discount_amount: form.value_type === "percent" && form.max_discount_amount > 0 ? form.max_discount_amount : null,
      _expires_in_days: form.expires_in_days,
      _note: form.note || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Урамшуулал олгосон");
    setForm({ ...form, note: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.rpc("admin_delete_wallet_credit" as any, { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Устгасан");
    load();
  };

  const filtered = rows.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(r.user_email || "").toLowerCase().includes(q) && !(r.user_name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Гараар урамшуулал олгох</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Хэрэглэгч</label>
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Сонгох —</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || "(нэргүй)"} — {u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Төрөл</label>
            <select
              value={form.value_type}
              onChange={(e) => setForm({ ...form, value_type: e.target.value as any })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="fixed">Тогтмол дүн (₮)</option>
              <option value="percent">Хувь (%)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Утга</label>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Мин захиалга (₮)</label>
            <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} />
          </div>
          {form.value_type === "percent" && (
            <div>
              <label className="text-xs text-muted-foreground">Дээд хэмнэлт (₮, 0=хязгааргүй)</label>
              <Input type="number" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: Number(e.target.value) })} />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Хугацаа (хоног)</label>
            <Input type="number" value={form.expires_in_days} onChange={(e) => setForm({ ...form, expires_in_days: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Тайлбар</label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Жишээ: VIP урамшуулал" />
          </div>
        </div>
        <Button onClick={submit} disabled={saving} className="mt-4 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Олгох
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <h3 className="font-semibold flex-1">Урамшууллын түүх ({filtered.length})</h3>
          <Input placeholder="Хэрэглэгч хайх..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:w-64" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Бүгд</option>
            <option value="active">Идэвхтэй</option>
            <option value="used">Ашигласан</option>
            <option value="expired">Дууссан</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Уншиж байна...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-2">Хэрэглэгч</th>
                  <th className="text-left p-2">Төрөл</th>
                  <th className="text-left p-2">Утга</th>
                  <th className="text-left p-2">Мин</th>
                  <th className="text-left p-2">Статус</th>
                  <th className="text-left p-2">Хугацаа</th>
                  <th className="text-left p-2">Тайлбар</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-2">
                      <div className="text-xs">{r.user_name || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{r.user_email}</div>
                    </td>
                    <td className="p-2 text-xs">{r.credit_type}</td>
                    <td className="p-2 text-xs font-medium">
                      {r.value_type === "percent" ? `${r.value}%` : formatPrice(Number(r.value))}
                    </td>
                    <td className="p-2 text-xs">{r.min_order_amount ? formatPrice(Number(r.min_order_amount)) : "—"}</td>
                    <td className="p-2 text-xs">{r.status}</td>
                    <td className="p-2 text-[10px] text-muted-foreground">
                      {r.expires_at ? new Date(r.expires_at).toLocaleDateString("mn-MN") : "—"}
                    </td>
                    <td className="p-2 text-[10px] text-muted-foreground max-w-[160px] truncate">{r.note || "—"}</td>
                    <td className="p-2">
                      <button onClick={() => remove(r.id)} className="text-destructive hover:opacity-70">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                      Хоосон
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
