import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Plus, Loader2, Trash2, Pencil, Check, X } from "lucide-react";

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  note: string | null;
  is_active: boolean;
};

type Props = {
  drivers: Driver[];
  isAdmin: boolean;
  onChange: () => void | Promise<void>;
};

const DriversManager = ({ drivers, isAdmin, onChange }: Props) => {
  const [form, setForm] = useState({ full_name: "", phone: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", note: "" });

  const addDriver = async () => {
    const name = form.full_name.trim();
    if (!name) {
      toast.error("Жолоочийн нэрийг оруулна уу");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("drivers" as any).insert({
      full_name: name,
      phone: form.phone.trim() || null,
      note: form.note.trim() || null,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа: " + error.message);
      return;
    }
    toast.success("Жолооч нэмэгдлээ");
    setForm({ full_name: "", phone: "", note: "" });
    await onChange();
  };

  const toggleActive = async (d: Driver) => {
    const { error } = await supabase
      .from("drivers" as any)
      .update({ is_active: !d.is_active, updated_at: new Date().toISOString() } as any)
      .eq("id", d.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await onChange();
  };

  const startEdit = (d: Driver) => {
    setEditingId(d.id);
    setEditForm({
      full_name: d.full_name,
      phone: d.phone || "",
      note: d.note || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editForm.full_name.trim();
    if (!name) {
      toast.error("Нэр заавал шаардлагатай");
      return;
    }
    const { error } = await supabase
      .from("drivers" as any)
      .update({
        full_name: name,
        phone: editForm.phone.trim() || null,
        note: editForm.note.trim() || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", editingId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Шинэчиллээ");
    setEditingId(null);
    await onChange();
  };

  const removeDriver = async (d: Driver) => {
    if (!confirm(`"${d.full_name}" жолоочийг устгах уу?`)) return;
    const { error } = await supabase.from("drivers" as any).delete().eq("id", d.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Устгалаа");
    await onChange();
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Truck className="h-4 w-4" /> Шинэ жолооч бүртгэх
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Нэр *"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="tel"
              placeholder="Утас"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="text"
              placeholder="Тэмдэглэл"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={addDriver}
            disabled={saving || !form.full_name.trim()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Нэмэх
          </button>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm">Бүртгэлтэй жолоочид ({drivers.length})</h3>
        </div>
        {drivers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Жолооч бүртгэгдээгүй байна</p>
        ) : (
          <div className="divide-y divide-border">
            {drivers.map((d) => {
              const editing = editingId === d.id;
              return (
                <div key={d.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  {editing ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                        className="rounded-lg bg-secondary px-3 py-2 text-sm"
                        placeholder="Нэр"
                      />
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        className="rounded-lg bg-secondary px-3 py-2 text-sm"
                        placeholder="Утас"
                      />
                      <input
                        type="text"
                        value={editForm.note}
                        onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                        className="rounded-lg bg-secondary px-3 py-2 text-sm"
                        placeholder="Тэмдэглэл"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{d.full_name}</p>
                        {!d.is_active && (
                          <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Идэвхгүй</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.phone || "—"}
                        {d.note ? ` · ${d.note}` : ""}
                      </p>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {editing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                          >
                            <Check className="h-3.5 w-3.5" /> Хадгалах
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-xs font-bold px-3 py-1.5 rounded-lg"
                          >
                            <X className="h-3.5 w-3.5" /> Болих
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleActive(d)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80"
                          >
                            {d.is_active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                          </button>
                          <button
                            onClick={() => startEdit(d)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Засах
                          </button>
                          <button
                            onClick={() => removeDriver(d)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Устгах
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriversManager;
