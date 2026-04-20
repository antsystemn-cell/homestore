import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, BarChart3, Download, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { getAutoThumbnail, detectProvider } from "@/lib/storyVideoUrl";

type StoryVideo = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  position: number | null;
  product_id: string | null;
  view_count?: number | null;
};

type ProductOpt = { id: string; name: string };

const emptyForm = { title: "", video_url: "", thumbnail_url: "", is_active: true, position: 0, product_id: "" };

const StoryVideosAdmin = () => {
  const [stories, setStories] = useState<StoryVideo[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingThumb, setFetchingThumb] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const handleUploadThumbnail = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Зөвхөн зураг оруулна уу");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Зургийн хэмжээ 5MB-аас бага байх ёстой");
      return;
    }
    setUploadingThumb(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("story-thumbnails")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("story-thumbnails").getPublicUrl(fileName);
      setForm((f) => ({ ...f, thumbnail_url: pub.publicUrl }));
      toast.success("Зураг амжилттай байршууллаа");
    } catch (e: any) {
      toast.error(e.message || "Зураг байршуулж чадсангүй");
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleAutoFetchThumbnail = async () => {
    if (!form.video_url.trim()) {
      toast.error("Эхлээд видеоны линк оруулна уу");
      return;
    }
    setFetchingThumb(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-video-thumbnail", {
        body: { video_url: form.video_url.trim() },
      });
      if (error) throw error;
      if (data?.thumbnail_url) {
        setForm((f) => ({ ...f, thumbnail_url: data.thumbnail_url }));
        toast.success("Thumbnail амжилттай татлаа");
      } else {
        toast.error("Thumbnail олдсонгүй — гараар оруулна уу");
      }
    } catch (e: any) {
      toast.error(e.message || "Татаж чадсангүй");
    } finally {
      setFetchingThumb(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      supabase.from("story_videos").select("*").order("position", { ascending: true }).order("created_at", { ascending: false }),
      supabase.from("products").select("id,name").eq("is_active", true).order("name", { ascending: true }),
    ]);
    if (s.error) toast.error("Story татаж чадсангүй");
    else setStories((s.data || []) as StoryVideo[]);
    if (!p.error) setProducts((p.data || []) as ProductOpt[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.video_url.trim()) {
      toast.error("Гарчиг ба видеоны линк заавал");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      video_url: form.video_url.trim(),
      thumbnail_url: form.thumbnail_url.trim() || null,
      is_active: form.is_active,
      position: Number(form.position) || 0,
      product_id: form.product_id || null,
    };
    const { error } = editId
      ? await supabase.from("story_videos").update(payload).eq("id", editId)
      : await supabase.from("story_videos").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Шинэчиллээ" : "Story нэмлээ");
    reset();
    load();
  };

  const handleEdit = (s: StoryVideo) => {
    setEditId(s.id);
    setForm({
      title: s.title,
      video_url: s.video_url,
      thumbnail_url: s.thumbnail_url || "",
      is_active: s.is_active,
      position: s.position || 0,
      product_id: s.product_id || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.from("story_videos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Устгалаа"); load(); }
  };

  const toggleActive = async (s: StoryVideo) => {
    const { error } = await supabase.from("story_videos").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-4">
        <h3 className="font-bold text-base md:text-lg">{editId ? "Story засах" : "Шинэ story нэмэх"}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Гарчиг *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="Жишээ: Шинэ бүтээгдэхүүн"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Дараалал</label>
            <input
              type="number"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: Number(e.target.value) })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Видеоны линк * (Facebook / YouTube / TikTok / Instagram)</label>
          <input
            value={form.video_url}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            placeholder="https://www.facebook.com/... эсвэл https://youtu.be/..."
            required
          />
          {form.video_url && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Илрүүлсэн: <span className="font-medium text-foreground">{detectProvider(form.video_url)}</span>
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Thumbnail зургийн URL (заавал биш — YouTube бол автомат)
          </label>
          <div className="flex gap-2">
            <input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={handleAutoFetchThumbnail}
              disabled={fetchingThumb || !form.video_url.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium disabled:opacity-50 whitespace-nowrap"
              title="TikTok/Facebook/Instagram-ээс жинхэнэ thumbnail татах"
            >
              {fetchingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Авто татах
            </button>
          </div>
          {!form.thumbnail_url && form.video_url && getAutoThumbnail(form.video_url) && (
            <img src={getAutoThumbnail(form.video_url)!} alt="auto" className="mt-2 h-20 rounded-lg object-cover" />
          )}
          {form.thumbnail_url && (
            <img src={form.thumbnail_url} alt="preview" className="mt-2 h-20 rounded-lg object-cover" />
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Холбогдох бараа (заавал биш)
          </label>
          <select
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— Сонгоогүй —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Сонгосон бол modal дотор "Энэ бараа руу очих" товч гарна.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded"
          />
          Идэвхтэй (нүүр хуудсанд харагдах)
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editId ? "Шинэчлэх" : "Нэмэх"}
          </button>
          {editId && (
            <button type="button" onClick={reset} className="px-4 py-2.5 text-sm rounded-xl border border-border hover:bg-secondary">
              Цуцлах
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        <h3 className="font-bold text-base md:text-lg">Бүх story ({stories.length})</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Уншиж байна...</p>
        ) : stories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Story алга байна</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stories.map((s) => {
              const thumb = s.thumbnail_url || getAutoThumbnail(s.video_url);
              return (
                <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex gap-3">
                  <div className="w-16 h-24 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
                    {thumb ? (
                      <img src={thumb} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-1">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{s.video_url}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary">{detectProvider(s.video_url)}</span>
                      <span className="text-[10px] text-muted-foreground">#{s.position || 0}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1" title="Үзсэн тоо">
                        <BarChart3 className="h-3 w-3" />
                        {s.view_count ?? 0}
                      </span>
                      {!s.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Идэвхгүй</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => toggleActive(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" title="Идэвхжүүлэх/унтраах">
                      {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleEdit(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryVideosAdmin;
