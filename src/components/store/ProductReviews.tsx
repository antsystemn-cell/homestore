import { useState, useEffect, useRef } from "react";
import { Star, Trash2, Send, Camera, X, EyeOff, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { invalidateProductStat } from "@/lib/productStats";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  user_name: string | null;
  images: string[] | null;
  is_hidden?: boolean;
  created_at: string;
}

interface Props {
  productId: string;
}

const StarRating = ({ rating, onChange, size = "md" }: { rating: number; onChange?: (r: number) => void; size?: "sm" | "md" | "lg" }) => {
  const px = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`${px} transition-colors ${
              star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Саяхан";
  if (mins < 60) return `${mins} минутын өмнө`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} өдрийн өмнө`;
  return new Date(date).toLocaleDateString("mn-MN");
};

// Compress image to WebP base64 (max 800px)
async function compressToBase64(file: File, maxDim = 800): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/webp", 0.75);
}

const ProductReviews = ({ productId }: Props) => {
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReviews((data || []) as Review[]);
    } catch (error) {
      console.error("Failed to load reviews", error);
      setReviews([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const checkCanReview = async () => {
    if (!user) { setCanReview(false); return; }
    const { data } = await supabase.rpc("has_purchased_product" as any, {
      _user_id: user.id,
      _product_id: productId,
    });
    setCanReview(Boolean(data));
  };

  useEffect(() => {
    void fetchReviews();
  }, [productId]);

  useEffect(() => {
    void checkCanReview();
  }, [productId, user?.id]);

  const visibleReviews = reviews.filter((r) => !r.is_hidden || isAdmin);
  const publicReviews = reviews.filter((r) => !r.is_hidden);
  const avgRating = publicReviews.length > 0 ? publicReviews.reduce((s, r) => s + r.rating, 0) / publicReviews.length : 0;

  const handlePickImages = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (images.length + files.length > 5) {
      toast.error("Хамгийн ихдээ 5 зураг оруулна");
      return;
    }
    setUploading(true);
    try {
      const encoded: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        encoded.push(await compressToBase64(f));
      }
      setImages((prev) => [...prev, ...encoded]);
    } catch {
      toast.error("Зураг боловсруулахад алдаа гарлаа");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Сэтгэгдэл бичихийн тулд нэвтэрнэ үү");
      return;
    }
    if (!canReview) {
      toast.error("Зөвхөн худалдан аваад хүлээн авсан хэрэглэгч сэтгэгдэл бичих боломжтой");
      return;
    }
    if (!comment.trim()) {
      toast.error("Сэтгэгдэл бичнэ үү");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.trim(),
      user_name: user.email?.split("@")[0] || "Хэрэглэгч",
      images,
    } as any);
    if (error) {
      toast.error("Сэтгэгдэл илгээхэд алдаа гарлаа");
    } else {
      toast.success("Сэтгэгдэл амжилттай нэмэгдлээ");
      setComment("");
      setRating(5);
      setImages([]);
      invalidateProductStat(productId);
      fetchReviews();
    }
    setSubmitting(false);
  };

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      toast.error("Устгахад алдаа гарлаа");
    } else {
      toast.success("Сэтгэгдэл устгагдлаа");
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      invalidateProductStat(productId);
    }
  };

  const handleToggleHidden = async (review: Review) => {
    const next = !review.is_hidden;
    const { error } = await (supabase.from("reviews") as any).update({ is_hidden: next }).eq("id", review.id);
    if (error) {
      toast.error("Шинэчлэхэд алдаа гарлаа");
    } else {
      toast.success(next ? "Нуугдлаа" : "Ил гарлаа");
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, is_hidden: next } : r)));
      invalidateProductStat(productId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Сэтгэгдэл ({publicReviews.length})</h2>
        {publicReviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} size="sm" />
            <span className="text-sm font-medium text-foreground">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Review form */}
      {user ? (
        canReview ? (
          <div className="bg-secondary rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Сэтгэгдэл бичих</p>
            <StarRating rating={rating} onChange={setRating} size="lg" />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Таны сэтгэгдэл..."
              rows={3}
              maxLength={1000}
              className="w-full rounded-xl bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />

            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((src, i) => (
                  <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden">
                    <img src={src} alt={`upload-${i}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePickImages(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || images.length >= 5}
                className="flex items-center gap-1.5 bg-background text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-background/80 transition-colors disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
                {uploading ? "Ачаалж байна..." : "Зураг"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !comment.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Илгээж байна..." : "Илгээх"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-secondary/50 rounded-xl p-4 text-sm text-muted-foreground">
            Зөвхөн худалдан аваад хүлээн авсан хэрэглэгч сэтгэгдэл бичих боломжтой.
          </div>
        )
      ) : (
        <div className="bg-secondary/50 rounded-xl p-4 text-sm text-muted-foreground">
          Сэтгэгдэл бичихийн тулд нэвтэрнэ үү.
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Уншиж байна...</p>
      ) : loadError ? (
        <p className="text-sm text-muted-foreground text-center py-4">Сэтгэгдэл түр ачаалах боломжгүй байна.</p>
      ) : visibleReviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Одоогоор сэтгэгдэл алга.</p>
      ) : (
        <div className="space-y-3">
          {visibleReviews.map((review) => (
            <div key={review.id} className={`bg-secondary/50 rounded-xl p-4 space-y-2 ${review.is_hidden ? "opacity-60 border border-dashed border-muted-foreground/30" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase">
                    {(review.user_name || "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {review.user_name || "Хэрэглэгч"}
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-semibold">Худалдан авсан</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(review.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} size="sm" />
                  {isAdmin && (
                    <button onClick={() => handleToggleHidden(review)}
                      title={review.is_hidden ? "Ил гаргах" : "Нуух"}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                      {review.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {(user?.id === review.user_id || isAdmin) && (
                    <button onClick={() => handleDelete(review.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-10">{review.comment}</p>
              )}
              {review.images && review.images.length > 0 && (
                <div className="pl-10 flex gap-2 flex-wrap">
                  {review.images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(src)}
                      className="h-20 w-20 rounded-lg overflow-hidden bg-background"
                    >
                      <img src={src} alt={`review-${i}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="review" className="max-h-[90vh] max-w-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
