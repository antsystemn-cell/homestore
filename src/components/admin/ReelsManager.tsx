import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff, Plus, Film } from "lucide-react";

type Reel = {
  id: string;
  facebook_embed_url: string;
  facebook_page_url: string | null;
  product_id: string | null;
  title: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type ProductLite = { id: string; name: string };
type ProductVideo = { url: string; label: string };

const isVideoUrl = (u: string) => {
  if (!u) return false;
  if (u.startsWith("storage://product-videos/")) return true;
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(u);
};

const ReelsManager = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productVideos, setProductVideos] = useState<ProductVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    facebook_embed_url: "",
    facebook_page_url: "",
    product_id: "",
    title: "",
    sort_order: 0,
  });

  const load = async () => {
    setLoading(true);
    const [{ data: rs }, { data: ps }] = await Promise.all([
      supabase.from("reels").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name").eq("is_active", true).order("name"),
    ]);
    setReels((rs || []) as Reel[]);
    setProducts((ps || []) as ProductLite[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // Load videos of a selected product (detail_media videos + product_images video urls)
  useEffect(() => {
    if (!form.product_id) {
      setProductVideos([]);
      return;
    }
    (async () => {
      setLoadingVideos(true);
      const [{ data: prod }, { data: extras }] = await Promise.all([
        supabase.from("products").select("detail_media").eq("id", form.product_id).maybeSingle(),
        supabase.from("product_images").select("image_url, position").eq("product_id", form.product_id).order("position"),
      ]);
      const list: ProductVideo[] = [];
      const dm = Array.isArray((prod as any)?.detail_media) ? (prod as any).detail_media : [];
      dm.forEach((m: any, i: number) => {
        if (m?.type === "video" && m?.url) list.push({ url: m.url, label: `Дэлгэрэнгүй видео #${i + 1}` });
      });
      (extras || []).forEach((row: any, i: number) => {
        if (isVideoUrl(row.image_url)) list.push({ url: row.image_url, label: `Галерей видео #${i + 1}` });
      });
      setProductVideos(list);
      setLoadingVideos(false);
    })();
  }, [form.product_id]);

  const add = async () => {
    if (!form.facebook_embed_url.trim()) {
      toast.error("Видео URL шаардлагатай");
      return;
    }
    const { error } = await supabase.from("reels").insert({
      facebook_embed_url: form.facebook_embed_url.trim(),
      facebook_page_url: form.facebook_page_url.trim() || null,
      product_id: form.product_id || null,
      title: form.title.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reel нэмэгдлээ");
    setForm({ facebook_embed_url: "", facebook_page_url: "", product_id: "", title: "", sort_order: 0 });
    load();
  };

  const toggle = async (r: Reel) => {
    const { error } = await supabase.from("reels").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    const { error } = await supabase.from("reels").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Устгагдлаа");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Шинэ Reel нэмэх</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Холбогдох бараа</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value, facebook_embed_url: "" })}
            >
              <option value="">— Байхгүй —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {form.product_id && (
            <div className="md:col-span-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-medium flex items-center gap-1.5"><Film className="h-3.5 w-3.5" /> Барааны оруулсан видео сонгох</p>
              {loadingVideos ? (
                <p className="text-xs text-muted-foreground">Ачааллаж байна...</p>
              ) : productVideos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Энэ бараанд оруулсан видео олдсонгүй. Доор URL шууд бичнэ үү.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {productVideos.map((v) => (
                    <button
                      key={v.url}
                      type="button"
                      onClick={() => setForm({ ...form, facebook_embed_url: v.url })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        form.facebook_embed_url === v.url
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Видео URL * <span className="text-[10px] opacity-70">(Барааны видео эсвэл Facebook Reels/Video линк)</span></label>
            <Input
              placeholder="storage://product-videos/... эсвэл https://www.facebook.com/[page]/videos/[id]"
              value={form.facebook_embed_url}
              onChange={(e) => setForm({ ...form, facebook_embed_url: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Facebook Page URL (заавал биш)</label>
            <Input
              placeholder="https://www.facebook.com/[page]"
              value={form.facebook_page_url}
              onChange={(e) => setForm({ ...form, facebook_page_url: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Гарчиг</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Дараалал</label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </div>
        </div>
        <Button onClick={add}>Нэмэх</Button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Ачааллаж байна...</p>
        ) : reels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Reels байхгүй байна</p>
        ) : (
          reels.map((r) => {
            const prod = products.find((p) => p.id === r.product_id);
            const isNative = !r.facebook_embed_url.includes("facebook.com") && !r.facebook_embed_url.includes("fb.watch");
            return (
              <div key={r.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-2">
                    {isNative && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Барааны видео</span>}
                    {r.title || r.facebook_embed_url}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{r.facebook_embed_url}</p>
                  {prod && <p className="text-xs text-primary">🛒 {prod.name}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${r.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {r.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                </span>
                <Button size="icon" variant="ghost" onClick={() => toggle(r)}>
                  {r.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => del(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReelsManager;
