import { useEffect, useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Facebook, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/context/CartContext";
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
      {title && (
        <p className="sr-only">{title}</p>
      )}
    </div>
  );
};

const ReelsPage = () => {

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { addToCart } = useCart();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: rs } = await supabase
        .from("reels")
        .select("id, facebook_embed_url, facebook_page_url, product_id, title")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      const list = (rs || []) as Reel[];
      const pids = list.map((r) => r.product_id).filter(Boolean) as string[];
      if (pids.length) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, slug, name, price, original_price, thumbnail_url, image_url, stock")
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
    // Re-parse XFBML when reels change
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
        className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-sm"
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
          {reels.map((r) => {
            const url = r.facebook_embed_url;
            const isFacebook = url.includes("facebook.com") || url.includes("fb.watch");
            const src = isFacebook
              ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=0`
              : "";
            return (
            <section
              key={r.id}
              className="h-screen w-full snap-start relative flex items-center justify-center bg-black"
            >
              {isFacebook ? (
                <>
                  <iframe
                    src={src}
                    className="w-full h-full border-0"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                    title={r.title || "Reel"}
                  />
                  {/* Fallback: if FB blocks embedding ("Unavailable"), user can still open original */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-16 right-3 z-20 flex items-center gap-1.5 bg-black/70 hover:bg-black/90 backdrop-blur text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20"
                  >
                    <Facebook className="h-3.5 w-3.5" /> Нээх
                  </a>
                </>
              ) : (
                <NativeReelVideo url={url} title={r.title} />
              )}





              {/* Overlay actions */}
              <div className="absolute bottom-24 left-0 right-0 px-3 flex flex-col gap-2 z-10">
                {r.title && !r.product && (
                  <p className="text-white text-sm font-medium drop-shadow bg-black/40 backdrop-blur px-3 py-2 rounded-lg">
                    {r.title}
                  </p>
                )}

                {r.product && (
                  <div className="bg-black/60 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-2.5 border border-white/10">
                    <button
                      onClick={() => navigate(`/product/${r.product!.slug || r.product!.id}`)}
                      className="flex-shrink-0"
                    >
                      <img
                        src={r.product.thumbnail_url || r.product.image_url || ""}
                        alt={r.product.name}
                        className="h-14 w-14 rounded-lg object-cover bg-white"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-1">{r.product.name}</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-white font-bold text-sm">
                          {r.product.price.toLocaleString()}₮
                        </span>
                        {r.product.original_price && r.product.original_price > r.product.price && (
                          <span className="text-white/50 text-[10px] line-through">
                            {r.product.original_price.toLocaleString()}₮
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addToCart(r.product as any, null, null, 1);
                        toast.success("Сагсанд нэмэгдлээ");
                      }}
                      className="flex-shrink-0 h-10 w-10 rounded-full bg-white/95 text-black flex items-center justify-center active:scale-95"
                      aria-label="Сагсанд нэмэх"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        addToCart(r.product as any, null, null, 1);
                        navigate("/checkout");
                      }}
                      className="flex-shrink-0 h-10 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 active:scale-95"
                    >
                      <Zap className="h-3.5 w-3.5" /> Захиалах
                    </button>
                  </div>
                )}

                {!r.product && r.facebook_page_url && (
                  <a
                    href={r.facebook_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#1877F2]/90 text-white font-semibold py-3 rounded-full backdrop-blur"
                  >
                    <Facebook className="h-4 w-4" /> Facebook-с үзэх
                  </a>
                )}
              </div>

            </section>
            );
          })}

        </div>
      )}
    </div>
  );
};

export default ReelsPage;
