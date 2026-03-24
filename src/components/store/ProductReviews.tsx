import { useState, useEffect } from "react";
import { Star, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  user_name: string | null;
  created_at: string;
}

interface Props {
  productId: string;
}

const StarRating = ({ rating, onChange, size = "md" }: { rating: number; onChange?: (r: number) => void; size?: "sm" | "md" }) => {
  const px = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
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

const ProductReviews = ({ productId }: Props) => {
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReviews((data || []) as Review[]);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Сэтгэгдэл бичихийн тулд нэвтэрнэ үү");
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
    } as any);
    if (error) {
      toast.error("Сэтгэгдэл илгээхэд алдаа гарлаа");
    } else {
      toast.success("Сэтгэгдэл амжилттай нэмэгдлээ");
      setComment("");
      setRating(5);
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
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Сэтгэгдэл ({reviews.length})</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} size="sm" />
            <span className="text-sm font-medium text-foreground">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Review form */}
      <div className="bg-secondary rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Сэтгэгдэл бичих</p>
        <StarRating rating={rating} onChange={setRating} />
        <div className="flex gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={user ? "Таны сэтгэгдэл..." : "Нэвтэрч сэтгэгдэл бичнэ үү"}
            rows={2}
            className="flex-1 rounded-xl bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || !comment.trim()}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Илгээж байна..." : "Илгээх"}
        </button>
      </div>

      {/* Reviews list */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Уншиж байна...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Одоогоор сэтгэгдэл алга. Та эхний сэтгэгдлийг бичнэ үү!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase">
                    {(review.user_name || "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{review.user_name || "Хэрэглэгч"}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(review.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} size="sm" />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
