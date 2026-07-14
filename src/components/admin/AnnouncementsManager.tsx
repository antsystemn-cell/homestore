import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { optimizeImage } from "@/lib/imageOptimize";

interface Announcement {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  is_active: boolean;
  position: number;
}

const emptyForm = {
  title: "",
  subtitle: "",
  body: "",
  image_url: "",
  button_text: "Дэлгэрэнгүй",
  button_link: "/shop",
};

const AnnouncementsManager = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((data as any) || []);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Зөвхөн зураг оруулна уу");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Зураг 5MB-ээс бага байх ёстой");
      return;
    }
    try {
      const webpUrl = await optimizeImage(file);
      setForm((f) => ({ ...f, image_url: webpUrl }));
      toast.success("Зураг оруулагдлаа");
    } catch {
      toast.error("Зураг оновчлоход алдаа");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Гарчиг оруулна уу");
      return;
    }
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      body: form.body.trim() || null,
      image_url: form.image_url || null,
      button_text: form.button_text.trim() || null,
      button_link: form.button_link.trim() || null,
    };
    if (editId) {
      const { error } = await supabase.from("announcements").update(payload).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Шинэчлэгдлээ");
    } else {
      const { error } = await supabase
        .from("announcements")
        .insert({ ...payload, position: items.length } as any);
      if (error) return toast.error(error.message);
      toast.success("Мэдэгдэл нэмэгдлээ");
    }
    setForm(emptyForm);
    setEditId(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Устгагдлаа");
    fetchItems();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !current })
      .eq("id", id);
    if (error) return toast.error(error.message);
    fetchItems();
  };

  const startEdit = (a: Announcement) => {
    setEditId(a.id);
    setForm({
      title: a.title,
      subtitle: a.subtitle || "",
      body: a.body || "",
      image_url: a.image_url || "",
      button_text: a.button_text || "",
      button_link: a.button_link || "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
        <div>
          <h3 className="font-bold text-base">
            {editId ? "Мэдэгдэл засах" : "Шинэ мэдэгдэл нэмэх"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Хэрэглэгч анх вэбрүү орсны дараа popup хэлбэрээр харагдана. Нэг өдөрт нэг л удаа.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Гарчиг *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            placeholder="Дэд гарчиг (жишээ: ХЯМДРАЛ)"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <textarea
          placeholder="Тайлбар (олон мөр бичиж болно)"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={4}
          className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Товчлуурын текст"
            value={form.button_text}
            onChange={(e) => setForm((f) => ({ ...f, button_text: e.target.value }))}
            className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            placeholder="Линк (/shop эсвэл https://...)"
            value={form.button_link}
            onChange={(e) => setForm((f) => ({ ...f, button_link: e.target.value }))}
            className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Зураг (заавал биш)</label>
          <div className="flex items-center gap-3">
            {form.image_url ? (
              <img
                src={form.image_url}
                alt="Мэдэгдэл"
                className="h-20 w-28 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="h-20 w-28 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              >
                <Upload className="h-3.5 w-3.5" /> Зураг оруулах
              </button>
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                  className="text-xs text-destructive hover:underline"
                >
                  Зураг устгах
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            {editId ? "Шинэчлэх" : "Нэмэх"}
          </button>
          {editId && (
            <button
              onClick={() => {
                setForm(emptyForm);
                setEditId(null);
              }}
              className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Болих
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {items.map((a) => (
          <div key={a.id} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              {a.image_url ? (
                <img
                  src={a.image_url}
                  alt={a.title}
                  className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {a.subtitle && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {a.subtitle}
                  </p>
                )}
                <p className="text-sm font-bold truncate">{a.title}</p>
                {a.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                )}
                {a.button_text && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Товч: {a.button_text} → {a.button_link}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(a.id, a.is_active)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    a.is_active
                      ? "bg-green-500/10 text-green-600"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {a.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                </button>
                <button
                  onClick={() => startEdit(a)}
                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Мэдэгдэл байхгүй</p>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsManager;
