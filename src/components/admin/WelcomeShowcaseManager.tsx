import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Upload, Image as ImageIcon, ArrowUp, ArrowDown, Plus, Save } from "lucide-react";
import { optimizeImage } from "@/lib/imageOptimize";

interface Item {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  position: number;
  is_active: boolean;
}

interface Settings {
  is_enabled: boolean;
  title: string;
  subtitle: string | null;
  image_size: number;
  columns: number;
  show_delay_ms: number;
}

const emptyForm = {
  image_url: "",
  title: "",
  subtitle: "",
  link_url: "/shop",
};

const WelcomeShowcaseManager = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    const [s, i] = await Promise.all([
      supabase.from("welcome_showcase_settings" as any).select("*").eq("id", 1).maybeSingle(),
      supabase.from("welcome_showcase_items" as any).select("*").order("position", { ascending: true }),
    ]);
    if (s.data) setSettings(s.data as any);
    if (i.data) setItems(i.data as any);
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Зөвхөн зураг оруулна уу");
    if (file.size > 5 * 1024 * 1024) return toast.error("5MB-ээс бага байх ёстой");
    try {
      const url = await optimizeImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("Зураг оруулагдлаа");
    } catch {
      toast.error("Зураг оновчлоход алдаа");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!form.image_url) return toast.error("Зураг оруулна уу");
    const payload = {
      image_url: form.image_url,
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      link_url: form.link_url.trim() || "/shop",
    };
    if (editId) {
      const { error } = await supabase.from("welcome_showcase_items" as any).update(payload).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Шинэчлэгдлээ");
    } else {
      const maxPos = items.reduce((m, it) => Math.max(m, it.position), 0);
      const { error } = await supabase.from("welcome_showcase_items" as any).insert({ ...payload, position: maxPos + 1 });
      if (error) return toast.error(error.message);
      toast.success("Нэмэгдлээ");
    }
    resetForm();
    void fetchAll();
  };

  const handleEdit = (item: Item) => {
    setEditId(item.id);
    setForm({
      image_url: item.image_url,
      title: item.title || "",
      subtitle: item.subtitle || "",
      link_url: item.link_url || "/shop",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.from("welcome_showcase_items" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Устгагдлаа");
    void fetchAll();
  };

  const toggleActive = async (item: Item) => {
    await supabase.from("welcome_showcase_items" as any).update({ is_active: !item.is_active }).eq("id", item.id);
    void fetchAll();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[idx];
    const b = items[target];
    await Promise.all([
      supabase.from("welcome_showcase_items" as any).update({ position: b.position }).eq("id", a.id),
      supabase.from("welcome_showcase_items" as any).update({ position: a.position }).eq("id", b.id),
    ]);
    void fetchAll();
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("welcome_showcase_settings" as any).update({
      is_enabled: settings.is_enabled,
      title: settings.title,
      subtitle: settings.subtitle,
      image_size: settings.image_size,
      columns: settings.columns,
      show_delay_ms: settings.show_delay_ms,
    }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Тохиргоо хадгалагдлаа");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Тавтай морил цонх</h2>
        <p className="text-sm text-muted-foreground">Анх сайтруу орсон үед гарах онцлох барааны цонхны тохиргоо</p>
      </div>

      {/* Settings */}
      {settings && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold">Ерөнхий тохиргоо</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.is_enabled}
              onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">Цонхыг идэвхжүүлэх</span>
          </label>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Гарчиг</label>
              <input
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Дэд гарчиг</label>
              <input
                value={settings.subtitle || ""}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Зургийн хэмжээ (px): {settings.image_size}</label>
              <input
                type="range"
                min={80}
                max={240}
                step={10}
                value={settings.image_size}
                onChange={(e) => setSettings({ ...settings, image_size: Number(e.target.value) })}
                className="w-full mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Багана: {settings.columns}</label>
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={settings.columns}
                onChange={(e) => setSettings({ ...settings, columns: Number(e.target.value) })}
                className="w-full mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Гарах хугацаа (ms): {settings.show_delay_ms}</label>
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={settings.show_delay_ms}
                onChange={(e) => setSettings({ ...settings, show_delay_ms: Number(e.target.value) })}
                className="w-full mt-1"
              />
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Тохиргоо хадгалах
          </button>
        </div>
      )}

      {/* Add / Edit form */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">{editId ? "Засах" : "Шинэ зүйл нэмэх"}</h3>

        <div className="flex items-start gap-3">
          <div className="w-24 h-24 rounded-lg border border-border overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0">
            {form.image_url ? (
              <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-secondary"
            >
              <Upload className="h-4 w-4" /> Зураг оруулах
            </button>
            <input
              placeholder="Гарчиг (заавал биш)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            />
            <input
              placeholder="Дэд гарчиг"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            />
            <input
              placeholder="Дарахад очих линк (жишээ: /shop, /sales, /product/abc)"
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            {editId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editId ? "Хадгалах" : "Нэмэх"}
          </button>
          {editId && (
            <button onClick={resetForm} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary">
              Болих
            </button>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Жагсаалт ({items.length})</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Одоогоор зүйл алга</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                <img src={item.image_url} alt="" className="w-14 h-14 rounded-md object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.title || "(Гарчиггүй)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.link_url}</div>
                </div>
                <button onClick={() => toggleActive(item)} className={`text-xs px-2 py-1 rounded-md ${item.is_active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {item.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                </button>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button onClick={() => handleEdit(item)} className="p-1.5 rounded-md hover:bg-secondary">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeShowcaseManager;
