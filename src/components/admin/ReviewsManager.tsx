import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Trash2, Eye, EyeOff, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

interface AdminReview {
  id: string;
  product_id: string;
  product_name: string | null;
  product_image: string | null;
  user_id: string;
  user_name: string | null;
  rating: number;
  comment: string | null;
  images: string[] | null;
  is_hidden: boolean;
  created_at: string;
}

const ReviewsManager = () => {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_reviews" as any, { _limit: 500, _offset: 0 });
    if (error) {
      toast.error("Ачаалахад алдаа гарлаа");
      setReviews([]);
    } else {
      setReviews((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const toggleHidden = async (r: AdminReview) => {
    const next = !r.is_hidden;
    const { error } = await (supabase.from("reviews") as any).update({ is_hidden: next }).eq("id", r.id);
    if (error) toast.error("Алдаа");
    else {
      toast.success(next ? "Нуугдлаа" : "Ил гарлаа");
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_hidden: next } : x)));
    }
  };

  const remove = async (r: AdminReview) => {
    if (!confirm("Энэ сэтгэгдлийг устгах уу?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", r.id);
    if (error) toast.error("Устгах алдаа");
    else {
      toast.success("Устгагдлаа");
      setReviews((prev) => prev.filter((x) => x.id !== r.id));
    }
  };

  const filtered = reviews.filter((r) => {
    if (filter === "visible" && r.is_hidden) return false;
    if (filter === "hidden" && !r.is_hidden) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.product_name || "").toLowerCase().includes(q) ||
        (r.user_name || "").toLowerCase().includes(q) ||
        (r.comment || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Сэтгэгдэл модераци</h2>
          <p className="text-sm text-muted-foreground">Нийт {reviews.length} сэтгэгдэл</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl px-4 py-2 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" /> Шинэчлэх
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "visible", "hidden"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "all" ? "Бүгд" : f === "visible" ? "Ил" : "Нуугдсан"}
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Хайх..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Уншиж байна...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Сэтгэгдэл алга.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`bg-card border border-border rounded-xl p-4 space-y-3 ${r.is_hidden ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {r.product_image ? (
                    <img src={r.product_image} alt={r.product_name || ""} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-secondary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.product_name || "—"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{r.user_name || "Хэрэглэгч"}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("mn-MN")}</span>
                      {r.is_hidden && <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-semibold">Нуугдсан</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleHidden(r)}
                    title={r.is_hidden ? "Ил гаргах" : "Нуух"}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                  >
                    {r.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
              {r.images && r.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {r.images.map((src, i) => (
                    <img key={i} src={src} alt={`review-${i}`} className="h-20 w-20 object-cover rounded-lg" loading="lazy" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsManager;
