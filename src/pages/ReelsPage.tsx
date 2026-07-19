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

  if (isMobile === false) return <Navigate to="/" replace />;

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
            const src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
              r.facebook_embed_url
            )}&show_text=false&autoplay=true&mute=0`;
            return (
            <section
              key={r.id}
              className="h-screen w-full snap-start relative flex items-center justify-center bg-black"
            >
              <iframe
                src={src}
                className="w-full h-full border-0"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                title={r.title || "Reel"}
              />


              {/* Overlay actions */}
              <div className="absolute bottom-24 left-0 right-0 px-4 flex flex-col gap-2 z-10">
                {r.title && (
                  <p className="text-white text-sm font-medium drop-shadow bg-black/40 backdrop-blur px-3 py-2 rounded-lg">
                    {r.title}
                  </p>
                )}
                <div className="flex gap-2">
                  {r.product_id && (
                    <button
                      onClick={() =>
                        navigate(`/product/${r.product_slug || r.product_id}`)
                      }
                      className="flex-1 flex items-center justify-center gap-2 bg-white/90 text-black font-semibold py-3 rounded-full backdrop-blur"
                    >
                      <ShoppingCart className="h-4 w-4" /> Барааг авах
                    </button>
                  )}
                  {r.facebook_page_url && (
                    <a
                      href={r.facebook_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-[#1877F2]/90 text-white font-semibold py-3 rounded-full backdrop-blur"
                    >
                      <Facebook className="h-4 w-4" /> Facebook-с үзэх
                    </a>
                  )}
                </div>
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
