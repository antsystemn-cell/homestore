import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff, Plus } from "lucide-react";

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

const ReelsManager = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
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

  const add = async () => {
    if (!form.facebook_embed_url.trim()) {
      toast.error("Facebook Reels/Video URL шаардлагатай");
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
          <div>
            <label className="text-xs text-muted-foreground">Facebook Reels/Video URL *</label>
            <Input
              placeholder="https://www.facebook.com/[page]/videos/[id]"
              value={form.facebook_embed_url}
              onChange={(e) => setForm({ ...form, facebook_embed_url: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Facebook Page URL</label>
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
            <label className="text-xs text-muted-foreground">Холбогдох бараа</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            >
              <option value="">— Байхгүй —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
            return (
              <div key={r.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title || r.facebook_embed_url}</p>
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
