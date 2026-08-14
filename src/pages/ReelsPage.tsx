import { useEffect, useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  Facebook,
  Zap,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";
import ReelComments from "@/components/store/ReelComments";
import { toast } from "sonner";

type ReelProduct = {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  original_price?: number | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  stock?: number | null;
};

type Reel = {
  id: string;
  facebook_embed_url: string;
  facebook_page_url: string | null;
  product_id: string | null;
  title: string | null;
  description: string | null;
  product?: ReelProduct | null;
};

declare global {
  interface Window {
    FB?: { XFBML: { parse: (el?: HTMLElement) => void } };
  }
}

const NativeReelVideo = ({ url, title }: { url: string; title: string | null }) => {
  const [resolved, setResolved] = useState<string>(() => (url.startsWith("storage://product-videos/") ? "" : url));
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!url.startsWith("storage://product-videos/")) {
      setResolved(url);
      return;
    }
    const path = url.replace("storage://product-videos/", "");
    supabase.storage
      .from("product-videos")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setResolved(data?.signedUrl || "");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {resolved ? (
        <video
          ref={videoRef}
          src={resolved}
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="auto"
          className="w-full h-full object-contain"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            v.muted = muted;
            const p = v.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          }}
        />
      ) : (
        <div className="text-white/60 text-xs">Видео ачааллаж байна...</div>
      )}
      <button
        onClick={() => {
          const v = videoRef.current;
          const next = !muted;
          setMuted(next);
          if (v) v.muted = next;
        }}
        className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-xs"
        aria-label={muted ? "Дуутай болгох" : "Дуугүй болгох"}
      >
        {muted ? "🔇 Дуутай" : "🔊 Дуугүй"}
      </button>
      {title && <p className="sr-only">{title}</p>}
    </div>
  );
};

const RailButton = ({
  icon,
  label,
  active,
  onClick,
  activeClass = "text-red-500",
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  activeClass?: string;
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
  >
    <span
      className={`h-11 w-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center ${
        active ? activeClass : "text-white"
      }`}
    >
      {icon}
    </span>
    <span className="text-[10px] text-white/90 font-medium drop-shadow">{label}</span>
  </button>
);

const ReelCard = ({ reel }: { reel: Reel }) => {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const deviceId = getDeviceFingerprint();
  const url = reel.facebook_embed_url;
  const isFacebook = url.includes("facebook.com") || url.includes("fb.watch");
  const src = isFacebook
    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=0`
    : "";

  useEffect(() => {
    (async () => {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        supabase.from("reel_likes").select("id", { count: "exact", head: true }).eq("reel_id", reel.id),
        supabase
          .from("reel_comments")
          .select("id", { count: "exact", head: true })
          .eq("reel_id", reel.id)
          .eq("is_hidden", false),
      ]);
      setLikeCount(lc || 0);
      setCommentCount(cc || 0);

      const q = supabase.from("reel_likes").select("id").eq("reel_id", reel.id).limit(1);
      const { data } = user ? await q.eq("user_id", user.id) : await q.eq("device_id", deviceId);
      setLiked((data || []).length > 0);
    })();
  }, [reel.id, user?.id]);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) {
      const { error } = await supabase.from("reel_likes").insert({
        reel_id: reel.id,
        user_id: user?.id ?? null,
        device_id: user ? null : deviceId,
      });
      if (error) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    } else {
      const del = supabase.from("reel_likes").delete().eq("reel_id", reel.id);
      if (user) await del.eq("user_id", user.id);
      else await del.eq("device_id", deviceId);
    }
  };

  const share = async () => {
    const link = reel.product
      ? `${window.location.origin}/product/${reel.product.slug || reel.product.id}`
      : `${window.location.origin}/reels`;
    try {
      if (navigator.share) {
        await navigator.share({ title: reel.title || "EasyShop", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        toast.success("Линк хуулагдлаа");
      }
    } catch {
      /* user cancelled */
    }
  };

  const favorite = () => {
    if (!reel.product) {
      toast.error("Холбогдох бараа алга");
      return;
    }
    toggleWishlist(reel.product as any);
    toast.success(isInWishlist(reel.product.id) ? "Хадгалснаас хаслаа" : "Хадгаллаа");
  };

  return (
    <section className="h-screen w-full snap-start relative flex items-center justify-center bg-black overflow-hidden">
      {isFacebook ? (
        <>
          <iframe
            src={src}
            className="w-full h-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            title={reel.title || "Reel"}
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-16 right-3 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20"
          >
            <Facebook className="h-3.5 w-3.5" /> Нээх
          </a>
        </>
      ) : (
        <NativeReelVideo url={url} title={reel.title} />
      )}

      {/* Gradient for readability */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Right action rail */}
      <div className="absolute right-2.5 bottom-40 z-20 flex flex-col items-center gap-4">
        <RailButton
          icon={<Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />}
          label={likeCount ? String(likeCount) : "Таалагдлаа"}
          active={liked}
          onClick={toggleLike}
        />
        <RailButton
          icon={<MessageCircle className="h-5 w-5" />}
          label={commentCount ? String(commentCount) : "Сэтгэгдэл"}
          onClick={() => setCommentsOpen(true)}
        />
        <RailButton
          icon={
            <Bookmark
              className={`h-5 w-5 ${reel.product && isInWishlist(reel.product.id) ? "fill-current" : ""}`}
            />
          }
          label="Хадгалах"
          active={!!reel.product && isInWishlist(reel.product.id)}
          activeClass="text-yellow-400"
          onClick={favorite}
        />
        <RailButton icon={<Share2 className="h-5 w-5" />} label="Хуваалцах" onClick={share} />
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-20 left-0 right-16 px-3 z-20 flex flex-col gap-2">
        {reel.title && <p className="text-white text-sm font-semibold drop-shadow">{reel.title}</p>}

        {reel.description && (
          <p
            onClick={() => setExpanded((v) => !v)}
            className={`text-white/85 text-xs leading-relaxed drop-shadow ${expanded ? "" : "line-clamp-2"}`}
          >
            {reel.description}
          </p>
        )}

        {reel.product && (
          <div className="flex items-stretch gap-2">
            {/* Douyin-style product link tile */}
            <button
              onClick={() => navigate(`/product/${reel.product!.slug || reel.product!.id}`)}
              className="flex-1 min-w-0 flex items-center gap-2 bg-black/55 backdrop-blur-md border border-white/15 rounded-lg p-1.5 text-left active:scale-[0.98] transition-transform"
            >
              <img
                src={reel.product.thumbnail_url || reel.product.image_url || ""}
                alt={reel.product.name}
                loading="lazy"
                className="h-11 w-11 rounded-md object-cover bg-white flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-[12px] leading-tight line-clamp-2">{reel.product.name}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-white font-bold text-[13px]">
                    {reel.product.price.toLocaleString()}₮
                  </span>
                  {reel.product.original_price && reel.product.original_price > reel.product.price && (
                    <span className="text-white/50 text-[10px] line-through">
                      {reel.product.original_price.toLocaleString()}₮
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/70 flex-shrink-0" />
            </button>

            <div className="flex flex-col gap-1 justify-center">
              <button
                onClick={() => {
                  addToCart(reel.product as any, null, null, 1);
                  toast.success("Сагсанд нэмэгдлээ");
                }}
                className="h-8 w-8 rounded-full bg-white/95 text-black flex items-center justify-center active:scale-95"
                aria-label="Сагсанд нэмэх"
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  addToCart(reel.product as any, null, null, 1);
                  navigate("/checkout");
                }}
                className="h-8 px-2.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1 active:scale-95"
              >
                <Zap className="h-3 w-3" /> Авах
              </button>
            </div>
          </div>
        )}


        {!reel.product && reel.facebook_page_url && (
          <a
            href={reel.facebook_page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#1877F2]/90 text-white font-semibold py-3 rounded-full backdrop-blur"
          >
            <Facebook className="h-4 w-4" /> Facebook-с үзэх
          </a>
        )}
      </div>

      <ReelComments
        reelId={reel.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
      />
    </section>
  );
};

const ReelsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: rs } = await supabase
        .from("reels")
        .select("id, facebook_embed_url, facebook_page_url, product_id, title, description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      const list = (rs || []) as Reel[];
      const pids = list.map((r) => r.product_id).filter(Boolean) as string[];
      if (pids.length) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, slug, name, price, original_price, thumbnail_url, image_url")
          .in("id", pids);
        const map = new Map((prods || []).map((p: any) => [p.id, p]));
        list.forEach((r) => {
          if (r.product_id) r.product = (map.get(r.product_id) as ReelProduct) || null;
        });
      }
      setReels(list);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!reels.length) return;
    const t = setTimeout(() => {
      if (window.FB?.XFBML && containerRef.current) {
        window.FB.XFBML.parse(containerRef.current);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [reels]);

  if (typeof window !== "undefined" && window.innerWidth >= 768) return <Navigate to="/" replace />;

  return (
    <div className="fixed inset-0 bg-black text-white z-50">
      <button
        onClick={() => navigate("/")}
        className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Буцах
      </button>

      {loading ? (
        <div className="h-full w-full flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        </div>
      ) : reels.length === 0 ? (
        <div className="h-full w-full flex items-center justify-center text-white/70 text-sm">
          Одоогоор reels байхгүй байна
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {reels.map((r) => (
            <ReelCard key={r.id} reel={r} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReelsPage;
