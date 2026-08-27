import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Truck, Shield, RotateCcw, ChevronLeft, ChevronRight, Play, Gift, X, Star, Users, AlertTriangle } from "lucide-react";
import { Product, formatPrice, mapDbProduct, DetailMedia } from "@/data/products";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ProductCard from "@/components/store/ProductCard";
import SimilarProducts from "@/components/store/SimilarProducts";
import ProductReviews from "@/components/store/ProductReviews";

import FrequentlyBoughtTogether from "@/components/store/FrequentlyBoughtTogether";
import LoadError from "@/components/store/LoadError";
import { fetchPublicProductBySlug, fetchPublicProductById, fetchPublicProductImages, fetchRelatedPublicProducts, fetchPublicBrands } from "@/lib/publicStoreApi";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";
import { useProductStat } from "@/hooks/useProductStat";
import { useFlashSaleFor } from "@/hooks/useFlashSales";
import FlashSaleCountdown from "@/components/store/FlashSaleCountdown";
import { supabase } from "@/integrations/supabase/client";
import { getColorHex } from "@/lib/colorMap";
import SmartSizeFinder from "@/components/store/SmartSizeFinder";


const ProductRatingSummary = ({ productId }: { productId: string }) => {
  const stat = useProductStat(productId);
  if (!stat || stat.count === 0) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-semibold text-foreground">{stat.avg.toFixed(1)}</span>
      <span>({stat.count} сэтгэгдэл)</span>
    </span>
  );
};

const ProductBuyerCount = ({ productId }: { productId: string }) => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_product_buyer_count" as any, { _product_id: productId }).then(({ data }) => {
      if (!cancelled) setCount(typeof data === "number" ? data : 0);
    });
    return () => { cancelled = true; };
  }, [productId]);
  if (!count) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5" />
      <span className="font-semibold text-foreground">{count.toLocaleString("mn-MN")}</span>
      <span>хэрэглэгч худалдан авсан</span>
    </span>
  );
};


const VideoWithThumbnail = ({ media }: { media: DetailMedia }) => {
  const [playing, setPlaying] = useState(false);

  if (!playing && media.thumbnail) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-secondary relative cursor-pointer group" onClick={() => setPlaying(true)}>
        <img src={media.thumbnail} alt={media.caption || "Video thumbnail"} className="w-full h-auto object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="h-7 w-7 text-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  const isYoutube = media.url.includes("youtube.com") || media.url.includes("youtu.be");
  const isFacebook = media.url.includes("facebook.com") || media.url.includes("fb.watch");

  if (isYoutube) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-secondary">
        <iframe
          src={media.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/") + (playing ? "?autoplay=1" : "")}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={media.caption || "Video"}
        />
      </div>
    );
  }

  if (isFacebook) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-secondary" style={{ aspectRatio: "9/16" }}>
        <iframe
          src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(media.url)}&show_text=false${playing ? "&autoplay=true" : ""}&width=0`}
          className="w-full h-full"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          title={media.caption || "Facebook Video"}
        />
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden bg-secondary">
      <video
        src={media.url}
        controls
        autoPlay
        muted={!playing}
        loop
        className="w-full h-auto"
        controlsList="nodownload"
        playsInline
      />
    </div>
  );
};

type GalleryItem =
  | { type: "image"; url: string }
  | { type: "video"; url: string; thumbnail?: string; caption?: string };

const getStorageVideoPath = (url: string) => {
  if (!url.startsWith("storage://product-videos/")) return null;
  return url.replace("storage://product-videos/", "");
};

const GalleryVideo = ({ item, active }: { item: Extract<GalleryItem, { type: "video" }>; active: boolean }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState(() => (getStorageVideoPath(item.url) ? "" : item.url));
  const [videoError, setVideoError] = useState(false);
  const isYoutube = item.url.includes("youtube.com") || item.url.includes("youtu.be");
  const isFacebook = item.url.includes("facebook.com") || item.url.includes("fb.watch");

  const attemptPlay = () => {
    const v = videoRef.current;
    if (!v || !active) return;
    v.muted = true;
    v.playsInline = true;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    const storagePath = getStorageVideoPath(item.url);
    setVideoError(false);
    if (!storagePath) {
      setResolvedUrl(item.url);
      return;
    }
    supabase.storage
      .from("product-videos")
      .createSignedUrl(storagePath, 60 * 60)
      .then(({ data, error }) => {
        if (!cancelled) {
          setVideoError(false);
          setResolvedUrl(error || !data?.signedUrl ? "" : data.signedUrl);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [item.url]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      setMuted(true);
      v.muted = true;
      v.playsInline = true;
      v.load();
      attemptPlay();
      const retryId = window.setTimeout(attemptPlay, 350);
      return () => window.clearTimeout(retryId);
    } else {
      v.pause();
    }
  }, [active, item.url, resolvedUrl]);

  if (isYoutube) {
    const base = item.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
    const src = `${base}?autoplay=1&mute=1&playsinline=1&loop=1`;
    return (
      <div className="w-full h-full flex-shrink-0 snap-start bg-black" style={{ minWidth: "100%" }}>
        {active && (
          <iframe
            src={src}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title={item.caption || "Video"}
          />
        )}
      </div>
    );
  }

  if (isFacebook) {
    return (
      <div className="w-full h-full flex-shrink-0 snap-start bg-black" style={{ minWidth: "100%" }}>
        {active && (
          <iframe
            src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(item.url)}&show_text=false&autoplay=true&mute=1&width=0`}
            className="w-full h-full"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            title={item.caption || "Facebook Video"}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-shrink-0 snap-start bg-black flex items-center justify-center relative" style={{ minWidth: "100%" }}>
      {resolvedUrl ? (
        <video
          key={resolvedUrl}
          ref={videoRef}
          src={resolvedUrl}
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="auto"
          controls
          onLoadedMetadata={attemptPlay}
          onCanPlay={attemptPlay}
          onError={() => setVideoError(true)}
          className="w-full h-full object-contain"
          controlsList="nodownload"
        />
      ) : (
        <div className="text-xs text-muted-foreground">Видео ачааллаж байна...</div>
      )}
      {videoError && (
        <div className="absolute inset-x-4 bottom-16 rounded-xl bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground backdrop-blur">
          Видео формат дэмжигдэхгүй байна. MP4/WebM файл дахин оруулна уу.
        </div>
      )}
      {muted && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current) videoRef.current.muted = false;
            setMuted(false);
          }}
          className="absolute bottom-16 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur"
        >
          🔇 Дуутай
        </button>
      )}
    </div>
  );
};


const ProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [sizeFinderOpenSignal, setSizeFinderOpenSignal] = useState(0);
  const [selectedGiftPackageId, setSelectedGiftPackageId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState<number | null>(null);
  const [variantStock, setVariantStock] = useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetIntent, setSheetIntent] = useState<"cart" | "buy">("cart");
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const userInteractedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const scrollSyncTimerRef = useRef<number | null>(null);

  // Number of color variants with images — controls auto-scroll behavior
  const colorImageCount = (product?.colors || []).filter((c) => !!c.image).length;
  // Detect if any gallery slide is a video (inline or detailMedia) — video slides must not
  // be auto-scrolled past, otherwise the video gets paused a few seconds after entry.
  const hasAnyGalleryVideo = ((): boolean => {
    if (!product) return false;
    const isVideoUrl = (u: string) => u.startsWith("data:video/") || /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(u);
    if ((product.detailMedia || []).some((m) => m.type === "video" && m.url)) return true;
    return (allImages || []).some(isVideoUrl);
  })();
  const shouldAutoScroll =
    !hasAnyGalleryVideo &&
    colorImageCount >= 2 && allImages.length >= 2 && !selectedColor && !userInteractedRef.current;

  // Auto-advance gallery when product has 2+ color images (stops once user interacts)
  useEffect(() => {
    if (!shouldAutoScroll) return;
    const id = window.setInterval(() => {
      setActiveImg((i) => (i + 1) % allImages.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [shouldAutoScroll, allImages.length]);

  // Sync scroll position with activeImg (programmatic — guard against scroll handler echo)
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const target = activeImg * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 4) return;
    isProgrammaticScrollRef.current = true;
    el.scrollTo({ left: target, behavior: "smooth" });
    if (scrollSyncTimerRef.current) window.clearTimeout(scrollSyncTimerRef.current);
    scrollSyncTimerRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 500);
  }, [activeImg]);

  // When user selects a color, jump to that color's image
  useEffect(() => {
    if (!selectedColor || !product) return;
    const img = product.colors?.find((c) => c.name === selectedColor)?.image;
    if (!img) return;
    const idx = allImages.indexOf(img);
    if (idx >= 0) setActiveImg(idx);
  }, [selectedColor, product, allImages]);

  // Auto-select the only gift package when there's exactly one
  useEffect(() => {
    if (product?.giftPackages && product.giftPackages.length === 1) {
      setSelectedGiftPackageId(product.giftPackages[0].id);
    }
  }, [product]);

  const normalizedBrand = (brandName || "").toLowerCase().replace(/\s+/g, "");
  const isElleSportBrand = normalizedBrand.includes("elle") && normalizedBrand.includes("sport");
  const variantKey = `${selectedColor || ""}|${selectedSize || ""}`;
  const selectedVariantQty = Number(variantStock?.[variantKey]) || 0;
  const hasColors = (product?.colors?.length || 0) > 0;
  const hasSizes = (product?.sizes?.length || 0) > 0;
  const variantSelected = (!hasColors || !!selectedColor) && (!hasSizes || !!selectedSize);
  // Үлдэгдлийг зөвхөн Elle Sport брэнд дээр л тооцно. Бусад брэнд дээр үргэлж боломжтой.
  const isOutOfStock = isElleSportBrand
    ? (variantSelected ? selectedVariantQty <= 0 : (stockQty !== null && stockQty <= 0))
    : false;

  const flashSale = useFlashSaleFor(product?.id);
  const displayPrice = flashSale ? Number(flashSale.sale_price) : (product?.price ?? 0);
  const displayOriginal = flashSale ? (product?.price ?? null) : (product?.originalPrice ?? null);

  const handleAddToCart = (andNavigate?: boolean) => {
    if (product?.colors && product.colors.length > 0 && !selectedColor) {
      toast.error("Өнгөө сонгоно уу");
      return;
    }
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error("Хэмжээгээ сонгоно уу");
      return;
    }
    if (product?.giftPackages && product.giftPackages.length > 1 && !selectedGiftPackageId) {
      toast.error("Бэлгийн багцаа сонгоно уу 🎁");
      return;
    }
    if (isOutOfStock) {
      toast.error("Энэ бараа дууссан байна");
      return;
    }
    if (isElleSportBrand && quantity > selectedVariantQty) {
      toast.error(`Зөвхөн ${selectedVariantQty} ширхэг үлдсэн`);
      return;
    }
    const chosenPackage = product?.giftPackages?.find((p) => p.id === selectedGiftPackageId) || null;
    // If a flash sale is active, override cart price + mark as on-sale so wallet
    // credits are correctly disabled in checkout.
    const cartProduct = flashSale
      ? { ...product!, price: displayPrice, originalPrice: product!.price, isOnSale: true }
      : product!;
    addToCart(cartProduct, selectedColor, selectedSize, quantity, chosenPackage);
    setQuantity(1);
    if (andNavigate) {
      navigate("/cart");
    } else {
      toast.success("Сагсанд амжилттай нэмлээ 🛒");
    }
  };


  // Whether product requires the user to pick something before adding to cart
  const needsSelection = () => {
    if (!product) return false;
    const hasColors = (product.colors?.length || 0) > 0;
    const hasSizes = (product.sizes?.length || 0) > 0;
    const hasMultiGift = (product.giftPackages?.length || 0) > 1;
    return hasColors || hasSizes || hasMultiGift;
  };

  const openPurchase = (intent: "cart" | "buy") => {
    if (isOutOfStock) {
      toast.error("Энэ бараа дууссан байна");
      return;
    }
    if (isElleSportBrand && hasSizes && !selectedSize) {
      setSizeFinderOpenSignal((value) => value + 1);
      return;
    }
    if (needsSelection()) {
      setSheetIntent(intent);
      setSheetOpen(true);
      return;
    }
    handleAddToCart(intent === "buy");
  };

  const confirmSheet = () => {
    // Reuse existing validation + add-to-cart flow
    const beforeCount = 0; // handleAddToCart handles toasts itself
    handleAddToCart(sheetIntent === "buy");
    // Close sheet only if selections were valid — handleAddToCart returns void so
    // we close optimistically and let toast.error above signal any failure state.
    // To detect actual success, check required fields inline:
    const missingColor = !!(product?.colors?.length) && !selectedColor;
    const missingSize = !!(product?.sizes?.length) && !selectedSize;
    const missingGift = (product?.giftPackages?.length || 0) > 1 && !selectedGiftPackageId;
    if (!missingColor && !missingSize && !missingGift) {
      setSheetOpen(false);
    }
    void beforeCount;
  };


  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        if (!slug) throw new Error("Missing product slug");
        // Try slug first, fall back to ID lookup
        let rows = await fetchPublicProductBySlug(slug);
        if (!rows || rows.length === 0) {
          rows = await fetchPublicProductById(slug);
        }
        const data = rows?.[0];

        if (data) {
          const p = mapDbProduct(data);
          setProduct(p);
          setStockQty(typeof data.stock_quantity === "number" ? data.stock_quantity : null);
          setVariantStock((data.variant_stock && typeof data.variant_stock === "object") ? data.variant_stock : {});
          // Track product view
          import("@/lib/tracking").then(({ track }) => track("product_view", {
            product_id: p.id, category: p.category, value: p.price,
          }));

          if (data.brand_id) {
            try {
              const brands = await fetchPublicBrands();
              const b = (brands || []).find((x: any) => x.id === data.brand_id);
              setBrandName(b?.name || null);
            } catch {
              setBrandName(null);
            }
          } else {
            setBrandName(null);
          }

          const imgs = await fetchPublicProductImages(data.id);
          const extras = (imgs || []).map((r: any) => r.image_url);
          const colorImgs = (p.colors || []).map((c) => c.image).filter(Boolean) as string[];
          const combined = [p.image, ...extras, ...colorImgs];
          const seen = new Set<string>();
          const unique = combined.filter((u) => {
            if (!u || seen.has(u)) return false;
            seen.add(u);
            return true;
          });
          setAllImages(unique);
          setActiveImg(0);
          userInteractedRef.current = false;

          const { fetchRecommendationConfig } = await import("@/hooks/useRecommendationWeights");
          const cfg = await fetchRecommendationConfig();
          const rel = await fetchRelatedPublicProducts(data.category, data.id, {
            brandId: data.brand_id ?? null,
            price: data.price ?? null,
            name: data.name ?? null,
            limit: 8,
            weights: cfg.related,
          });
          setRelated((rel || []).map(mapDbProduct));
        } else {
          setProduct(null);
          setLoadError(true);
        }
      } catch (error) {
        console.error("Failed to load product", error);
        setProduct(null);
        setAllImages([]);
        setRelated([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void fetchProduct();
  }, [slug]);

  const galleryItems: GalleryItem[] = useMemo(() => {
    if (!product) return [];
    const isVideoUrl = (u: string) =>
      u.startsWith("storage://product-videos/") || u.startsWith("data:video/") || /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(u);
    const media: GalleryItem[] = (allImages.length > 0 ? allImages : [product.image]).map((u) =>
      isVideoUrl(u) ? { type: "video", url: u } : { type: "image", url: u }
    );
    const detailVideos: GalleryItem[] = (product.detailMedia || [])
      .filter((m) => m.type === "video" && m.url)
      .map((m) => ({ type: "video", url: m.url, thumbnail: m.thumbnail, caption: m.caption }));
    // Put videos first so autoplay kicks in on entry
    const inlineVideos = media.filter((m) => m.type === "video");
    const inlineImages = media.filter((m) => m.type === "image");
    return [...detailVideos, ...inlineVideos, ...inlineImages];
  }, [allImages, product]);
  const totalGallery = galleryItems.length;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Уншиж байна...</div>;
  }

  if (!product) {
    return loadError ? (
      <div className="min-h-screen bg-background">
        <LoadError message="Барааны мэдээлэл ачаалж чадсангүй" onRetry={() => window.location.reload()} />
      </div>
    ) : (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Бараа олдсонгүй
      </div>
    );
  }

  const liked = isInWishlist(product.id);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-12 relative">
      <div className="hidden md:block"><Header /></div>
      <div className="md:hidden absolute top-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-background/70 backdrop-blur-md hover:bg-background">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      </div>


      <div className="hidden md:block">
        <div className="max-w-6xl mx-auto px-8 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Буцах
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto md:px-8">
        <div className="md:grid md:grid-cols-[1fr_240px] md:gap-8">

          {/* LEFT column (desktop): image gallery + long content (description/specs/detail media) */}
          <div className="relative space-y-4 md:col-start-1 md:row-start-1">


            {/* Main product image */}
            <div className="relative">
              <div
                ref={galleryRef}
                className="w-full aspect-[4/5] md:aspect-square overflow-x-auto flex snap-x snap-mandatory no-scrollbar bg-secondary md:rounded-2xl scroll-smooth"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
                  if (!isProgrammaticScrollRef.current) {
                    userInteractedRef.current = true;
                  }
                  if (i !== activeImg && i >= 0 && i < totalGallery) {
                    setActiveImg(i);
                  }
                }}
                onTouchStart={() => { userInteractedRef.current = true; }}
                onPointerDown={() => { userInteractedRef.current = true; }}
              >
                {galleryItems.map((item, idx) =>
                  item.type === "image" ? (
                    <img
                      key={idx}
                      src={item.url}
                      alt={`${product.name}${idx > 0 ? ` - ${idx + 1}` : ""}`}
                      className="w-full h-full flex-shrink-0 object-cover snap-start"
                      style={{ minWidth: "100%" }}
                      loading={idx === 0 ? "eager" : "lazy"}
                      draggable={false}
                    />
                  ) : (
                    <GalleryVideo key={idx} item={item} active={idx === activeImg} />
                  )
                )}
              </div>
              {totalGallery > 1 && (
                <>
                  <button
                    onClick={() => {
                      userInteractedRef.current = true;
                      setActiveImg((i) => (i - 1 + totalGallery) % totalGallery);
                    }}
                    className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      userInteractedRef.current = true;
                      setActiveImg((i) => (i + 1) % totalGallery);
                    }}
                    className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-foreground" />
                  </button>


                  {/* Pagination dots at bottom */}
                  <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                    {galleryItems.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === activeImg ? "w-5 bg-white" : "w-1.5 bg-white/60"
                        }`}
                        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                      />
                    ))}
                  </div>
                </>
              )}
              <button
                onClick={() => toggleWishlist(product)}
                className="absolute bottom-4 right-4 p-2.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors shadow-sm"
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-sale text-sale" : "text-foreground"}`} />
              </button>

              {product.discount ? (
                <span className="absolute bottom-4 left-4 bg-sale text-sale-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                  -{product.discount}% хямдрал
                </span>
              ) : null}
            </div>
            {/* Thumbnails — hidden on mobile; color chips below act as selector */}
            {totalGallery > 1 && (
              <div className="hidden md:flex gap-2 px-4 md:px-0 overflow-x-auto pb-1">
                {galleryItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { userInteractedRef.current = true; setActiveImg(idx); }}
                    className={`relative h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors bg-secondary ${
                      idx === activeImg ? "border-primary" : "border-transparent"
                    }`}
                  >
                    {item.type === "image" ? (
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-black/70" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-4 w-4 text-white" fill="currentColor" />
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}


            {/* Color chooser below main image (mirrors buy-sheet styling) */}
            {product.colors && product.colors.length > 0 && (
              <div className="md:hidden">
              {/* mobile color chooser wrapper */}
              </div>
            )}
            {product.colors && product.colors.length > 0 && (
              <div className="px-4 md:px-0 pt-1 md:hidden">
                <div className="flex items-end justify-between mb-2 px-0.5">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground leading-none">Өнгө</h3>
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                      {selectedColor ? `Сонгосон: ${selectedColor}` : `${product.colors.length} сонголт`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 md:mx-0 px-4 md:px-0 pb-2 snap-x">
                  {product.colors.map((color) => {
                    const active = selectedColor === color.name;
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => {
                          userInteractedRef.current = true;
                          setSelectedColor(active ? null : color.name);
                        }}
                        className={`snap-start shrink-0 flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-2xl transition-all duration-200 active:scale-[0.97] ${
                          active
                            ? "bg-background border-2 border-foreground shadow-md"
                            : "bg-secondary/70 border-2 border-transparent"
                        }`}
                      >
                        {color.image ? (
                          <img
                            src={color.image}
                            alt={color.name}
                            className="h-11 w-11 rounded-xl object-cover ring-1 ring-black/5 bg-background"
                          />
                        ) : (
                          <span
                            className="h-11 w-11 rounded-xl ring-1 ring-black/10"
                            style={{ backgroundColor: getColorHex(color.name, (product as any).productCode || product.id) }}
                          />
                        )}
                        <span className={`text-[13px] leading-tight whitespace-nowrap ${active ? "font-bold text-foreground" : "font-semibold text-muted-foreground"}`}>
                          {color.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size chips — Elle Sport clothing, directly under color */}
            {isElleSportBrand && product.sizes && product.sizes.length > 0 && (
              <div className="px-4 md:px-0 pt-2 md:hidden">
                <div className="flex items-end justify-between mb-2 px-0.5">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground leading-none">Хэмжээ</h3>
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                      {selectedSize ? `Сонгосон: ${selectedSize}` : `${product.sizes.length} сонголт`}
                    </p>
                  </div>
                  {!selectedSize && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-destructive/80">
                      Заавал
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    let sizeQty: number | null = null;
                    if (variantStock) {
                      if (hasColors && selectedColor) {
                        sizeQty = Number(variantStock[`${selectedColor}|${size}`]) || 0;
                      } else if (hasColors) {
                        sizeQty = (product.colors || []).reduce(
                          (sum, c) => sum + (Number(variantStock[`${c.name}|${size}`]) || 0),
                          0
                        );
                      } else {
                        sizeQty = Number(variantStock[`|${size}`]) || 0;
                      }
                    }
                    const isSoldOut = sizeQty !== null && sizeQty <= 0;
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          userInteractedRef.current = true;
                          if (!isSoldOut) setSizeFinderOpenSignal((value) => value + 1);
                        }}
                        disabled={isSoldOut}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors flex flex-col items-center leading-tight min-w-[64px] ${
                          selectedSize === size
                            ? "border-primary bg-primary/10 text-foreground"
                            : isSoldOut
                            ? "border-border bg-secondary/50 text-muted-foreground/50 line-through cursor-not-allowed"
                            : "border-border bg-secondary text-muted-foreground hover:border-foreground/40"
                        }`}
                      >
                        <span>{size}</span>
                        {recommendedSize === size && (
                          <span className="text-[9px] font-bold text-primary leading-none mt-0.5">✓ Санал</span>
                        )}
                        {sizeQty !== null && (
                          <span className={`text-[10px] font-normal mt-0.5 ${
                            isSoldOut ? "text-destructive/70" : sizeQty <= 3 ? "text-destructive" : "text-muted-foreground/70"
                          }`}>
                            {isSoldOut ? "Дууссан" : `${sizeQty} ширхэг`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isElleSportBrand && product.sizes && product.sizes.length > 0 && (
              <div className="mx-4 md:mx-0 md:hidden flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-900">
                  Хэрэглэгч та размер хэмжээгээ сайн харж сонголт хийнэ үү. Хэрвээ сонголт буруу болсон тохиолдолд хэмжээ, размер солих зардалыг хэрэглэгч бүрэн хариуцна. <span className="font-semibold">(Буцаалт байхгүй)</span>
                </p>
              </div>
            )}



          </div>

          <div className="p-4 md:p-0 space-y-6 md:col-start-2 md:row-start-1">

            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{product.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {product.productCode ? (
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">#{product.productCode}</span>
                ) : null}
                <ProductRatingSummary productId={product.id} />
                <ProductBuyerCount productId={product.id} />
              </div>
            </div>


            <div className="space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap min-h-[40px]">
                <span className={`text-2xl md:text-3xl font-extrabold ${flashSale ? "text-destructive" : "text-foreground"}`}>
                  {formatPrice(displayPrice)}
                </span>
                {displayOriginal && displayOriginal > displayPrice ? (
                  <span className="text-muted-foreground line-through text-lg">{formatPrice(displayOriginal)}</span>
                ) : null}
                {product.isBogo ? (
                  <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs md:text-sm font-extrabold uppercase px-3 py-1.5 rounded-full shadow-lg ring-2 ring-primary/30 animate-pulse">
                    🎁 1+1 ҮНЭГҮЙ
                  </span>
                ) : null}
              </div>
              {product.isBogo ? (
                <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3">
                  <p className="text-sm font-bold text-primary">1 ширхэг авбал 1 ширхэг ҮНЭГҮЙ!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    2 ширхэг сагсанд нэмэхэд төлбөр нь 1 ширхэгийн үнэтэй тэнцэнэ.
                  </p>
                </div>
              ) : null}
            </div>

            {flashSale && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-lg">
                  ⚡ Flash Sale -{flashSale.discount_percent}%
                </span>
                <FlashSaleCountdown endsAt={flashSale.ends_at} />
              </div>
            )}

            {isElleSportBrand && product.sizes && product.sizes.length > 0 && (
              <SmartSizeFinder
                className=""
                productId={product.id}
                productCode={product.productCode}
                sizes={product.sizes}
                selectedSize={selectedSize}
                openSignal={sizeFinderOpenSignal}
                onSelectSize={(s) => setSelectedSize(s)}
                onSizeApplied={(s) => setSelectedSize(s)}
                onRecommend={(s) => setRecommendedSize(s)}
              />
            )}


            {/* Gift package summary — moved into purchase sheet */}


            {/* Stock — shown only for Elle Sport brand. Per-variant when color/size selected. */}
            {(() => {
              const normalized = (brandName || "").toLowerCase().replace(/\s+/g, "");
              const isElleSport = normalized.includes("elle") && normalized.includes("sport");
              if (!isElleSport) return null;

              const hasColors = (product.colors?.length || 0) > 0;
              const hasSizes = (product.sizes?.length || 0) > 0;
              const needsColor = hasColors && !selectedColor;
              const needsSize = hasSizes && !selectedSize;

              if (needsColor || needsSize) {
                const parts = [needsColor && "өнгө", needsSize && "хэмжээ"].filter(Boolean).join(" ба ");
                return (
                  <div className="text-sm">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground">
                      Үлдэгдэл харахын тулд {parts} сонгоно уу
                    </span>
                  </div>
                );
              }

              const key = `${selectedColor || ""}|${selectedSize || ""}`;
              const qty = Number(variantStock?.[key]) || 0;
              return (
                <div className="text-sm">
                  {qty > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-foreground font-medium">
                      Үлдэгдэл: <span className="font-bold">{qty}</span> ширхэг
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive font-medium">
                      Дууссан
                    </span>
                  )}
                </div>
              );
            })()}






            {/* Desktop color/size selectors */}
            {product.colors && product.colors.length > 0 && (
              <div className="hidden md:block">
                <div className="flex items-end justify-between mb-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground leading-none">Өнгө</h3>
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                      {selectedColor ? `Сонгосон: ${selectedColor}` : `${product.colors.length} сонголт`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const active = selectedColor === color.name;
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => {
                          userInteractedRef.current = true;
                          setSelectedColor(active ? null : color.name);
                        }}
                        className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-[0.97] ${
                          active ? "bg-background border-2 border-foreground shadow-md" : "bg-secondary/70 border-2 border-transparent hover:border-foreground/30"
                        }`}
                      >
                        {color.image ? (
                          <img src={color.image} alt={color.name} className="h-9 w-9 rounded-xl object-cover ring-1 ring-black/5 bg-background" />
                        ) : (
                          <span className="h-9 w-9 rounded-xl ring-1 ring-black/10" style={{ backgroundColor: getColorHex(color.name, (product as any).productCode || product.id) }} />
                        )}
                        <span className={`text-[13px] leading-tight whitespace-nowrap ${active ? "font-bold text-foreground" : "font-semibold text-muted-foreground"}`}>
                          {color.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isElleSportBrand && product.sizes && product.sizes.length > 0 && (
              <div className="hidden md:block">
                <div className="flex items-end justify-between mb-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-foreground leading-none">Хэмжээ</h3>
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                      {selectedSize ? `Сонгосон: ${selectedSize}` : `${product.sizes.length} сонголт`}
                    </p>
                  </div>
                  {!selectedSize && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-destructive/80">Заавал</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    let sizeQty: number | null = null;
                    if (variantStock) {
                      if (hasColors && selectedColor) {
                        sizeQty = Number(variantStock[`${selectedColor}|${size}`]) || 0;
                      } else if (hasColors) {
                        sizeQty = (product.colors || []).reduce((sum, c) => sum + (Number(variantStock[`${c.name}|${size}`]) || 0), 0);
                      } else {
                        sizeQty = Number(variantStock[`|${size}`]) || 0;
                      }
                    }
                    const isSoldOut = sizeQty !== null && sizeQty <= 0;
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          userInteractedRef.current = true;
                          if (!isSoldOut) setSizeFinderOpenSignal((value) => value + 1);
                        }}
                        disabled={isSoldOut}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors flex flex-col items-center leading-tight min-w-[64px] ${
                          selectedSize === size
                            ? "border-primary bg-primary/10 text-foreground"
                            : isSoldOut
                            ? "border-border bg-secondary/50 text-muted-foreground/50 line-through cursor-not-allowed"
                            : "border-border bg-secondary text-muted-foreground hover:border-foreground/40"
                        }`}
                      >
                        <span>{size}</span>
                        {recommendedSize === size && (
                          <span className="text-[9px] font-bold text-primary leading-none mt-0.5">✓ Санал</span>
                        )}
                        {sizeQty !== null && (
                          <span className={`text-[10px] font-normal mt-0.5 ${isSoldOut ? "text-destructive/70" : sizeQty <= 3 ? "text-destructive" : "text-muted-foreground/70"}`}>
                            {isSoldOut ? "Дууссан" : `${sizeQty} ширхэг`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


            {isElleSportBrand && product.sizes && product.sizes.length > 0 && (
              <div className="hidden md:flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-900">
                  Хэрэглэгч та размер хэмжээгээ сайн харж сонголт хийнэ үү. Хэрвээ сонголт буруу болсон тохиолдолд хэмжээ, размер солих зардалыг хэрэглэгч бүрэн хариуцна. <span className="font-semibold">(Буцаалт байхгүй)</span>
                </p>
              </div>
            )}

            <div className="hidden md:flex flex-col gap-3">
              <Button variant="outline" size="lg" disabled={isOutOfStock} className="flex-1 gap-2 rounded-xl h-14 text-base font-semibold" onClick={() => openPurchase("cart")}>
                <ShoppingCart className="h-5 w-5" />
                {isOutOfStock ? "Дууссан" : "Сагсанд нэмэх"}
              </Button>
              <Button
                size="lg"
                disabled={isOutOfStock}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-14 text-base font-semibold"
                onClick={() => openPurchase("buy")}
              >
                {isOutOfStock ? "Дууссан" : "Худалдаж авах"}
              </Button>
            </div>

            {/* Frequently bought together — mobile only, between price and description */}
            <div className="md:hidden -mx-4">
              <FrequentlyBoughtTogether productId={product.id} variant="carousel" limit={18} pageSize={6} />
            </div>
          </div>

          {/* RIGHT column row 2 (desktop): Frequently bought together aligned with description */}
          <aside className="hidden md:block md:col-start-2 md:row-start-2 md:mt-6">
            <FrequentlyBoughtTogether productId={product.id} variant="square" limit={5} />
          </aside>


          {/* BOTTOM-LEFT column (desktop): long content stacked below main image */}
          <div className="p-4 md:p-0 space-y-6 md:col-start-1 md:row-start-2 md:mt-6">


            {product.description && (
              <div className="bg-secondary rounded-xl p-4 md:p-5">
                <h2 className="font-semibold text-foreground mb-2">Тайлбар</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}


            {product.specifications && product.specifications.length > 0 && (
              <div className="bg-secondary rounded-xl p-4 md:p-5">
                <h2 className="font-semibold text-foreground mb-3">Үзүүлэлтүүд</h2>
                <div className="space-y-0 divide-y divide-border">
                  {product.specifications.map((spec, idx) => (
                    <div key={idx} className="flex justify-between py-2.5 first:pt-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">{spec.key}</span>
                      <span className="text-sm font-medium text-foreground">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail Media: Videos first, then images - below product info */}
            {product.detailMedia && product.detailMedia.length > 0 && (
              <div className="space-y-3">
                {[...product.detailMedia]
                  .sort((a, b) => {
                    if (a.type === "video" && b.type !== "video") return -1;
                    if (a.type !== "video" && b.type === "video") return 1;
                    return 0;
                  })
                  .map((media, idx) => (
                    <div key={idx} className="space-y-1.5">
                      {media.type === "image" ? (
                        <img src={media.url} alt={media.caption || ""} className="w-full rounded-xl object-cover" />
                      ) : media.type === "text" ? (
                        <div className="w-full rounded-xl bg-secondary/40 px-5 py-4 text-foreground whitespace-pre-wrap leading-relaxed font-sans text-[17px] md:text-lg" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          {media.caption}
                        </div>
                      ) : (
                        <VideoWithThumbnail media={media} />
                      )}
                      {media.type !== "text" && media.caption && (
                        <p className="text-xs text-muted-foreground px-1">{media.caption}</p>
                      )}
                    </div>
                  ))}

              </div>
            )}

          </div>
        </div>




        {/* Reviews */}
        <div className="mt-10 md:mt-16 px-4 md:px-0">
          <ProductReviews productId={product.id} />
        </div>

        {/* Similar products (grouped by brand + category) */}
        <div className="px-4 md:px-0">
          <SimilarProducts
            seed={{
              id: product.id,
              category: product.category,
              brand_id: (product as any).brand_id ?? null,
              price: product.price,
              name: product.name,
            }}
            brandName={brandName}
          />
        </div>

      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-3 safe-bottom flex gap-2 md:hidden z-50">
        <button
          onClick={() => toggleWishlist(product)}
          className={`flex items-center justify-center w-12 h-14 rounded-2xl border-2 transition-all ${
            liked ? "border-sale bg-sale/10" : "border-border bg-secondary hover:border-primary/40"
          }`}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-sale text-sale" : "text-muted-foreground"}`} />
        </button>
        <Button variant="outline" disabled={isOutOfStock} className="flex-1 gap-2 rounded-2xl h-14 font-bold text-sm border-2" onClick={() => openPurchase("cart")}>
          <ShoppingCart className="h-5 w-5" />
          {isOutOfStock ? "Дууссан" : "Сагсанд"}
        </Button>
        <Button
          disabled={isOutOfStock}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-14 font-bold text-sm shadow-lg"
          onClick={() => openPurchase("buy")}
        >
          {isOutOfStock ? "Дууссан" : "Шууд авах"}
        </Button>
      </div>

      {/* Purchase options sheet — opens on Add-to-cart / Buy-now when selections are needed */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto p-0">
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="text-base font-bold text-foreground text-left">
              {sheetIntent === "buy" ? "Худалдан авах" : "Сагсанд нэмэх"}
            </SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-5 space-y-5">
            {/* Product summary */}
            <div className="flex gap-3 items-center pb-3 border-b border-border">
              <img
                src={
                  selectedColor && product.colors?.find(c => c.name === selectedColor)?.image
                    ? product.colors.find(c => c.name === selectedColor)!.image
                    : product.image
                }
                alt={product.name}
                className="w-16 h-16 rounded-lg object-cover bg-secondary shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground line-clamp-2">{product.name}</p>
                <p className="text-base font-extrabold text-foreground mt-0.5">{formatPrice(product.price)}</p>
              </div>
            </div>

            {/* Gift package picker */}
            {product.giftPackages && product.giftPackages.length > 0 && (() => {
              const singlePackage = product.giftPackages.length === 1;
              return (
                <div className="bg-accent/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-accent-foreground" />
                      <span>{singlePackage ? "🎁 Дагалдах бэлэг" : "🎁 Бэлгийн багц"}</span>
                    </div>
                    {!singlePackage && selectedGiftPackageId && (
                      <button
                        type="button"
                        onClick={() => setSelectedGiftPackageId(null)}
                        className="text-xs font-medium text-muted-foreground underline"
                      >
                        Цэвэрлэх
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {product.giftPackages.map((pkg) => {
                      const active = selectedGiftPackageId === pkg.id;
                      const interactive = !singlePackage;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          disabled={!interactive}
                          onClick={() => interactive && setSelectedGiftPackageId(active ? null : pkg.id)}
                          className={`flex flex-col gap-1.5 rounded-lg p-2.5 border-2 text-left transition-colors ${
                            active ? "border-primary bg-primary/10" : "border-border bg-background"
                          } ${!interactive ? "cursor-default" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            {interactive && (
                              <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? "border-primary" : "border-muted-foreground/40"}`}>
                                {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-foreground">{pkg.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{pkg.items.length} зүйл</span>
                          </div>
                          {pkg.items.length > 0 && (
                            <div className={`flex flex-wrap gap-1.5 ${interactive ? "pl-6" : ""}`}>
                              {pkg.items.map((gift) => (
                                <span key={gift.product_id} className="text-[11px] bg-secondary text-foreground rounded px-1.5 py-0.5">
                                  {gift.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Color */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <div className="flex items-end justify-between mb-3 px-0.5">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold text-foreground leading-none">Өнгө</h3>
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                      {selectedColor ? `Сонгосон: ${selectedColor}` : `Сонголт: ${product.colors.length}`}
                    </p>
                  </div>
                  {!selectedColor && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-destructive/80">
                      Заавал
                    </span>
                  )}
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2 snap-x">
                  {product.colors.map((color) => {
                    const active = selectedColor === color.name;
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setSelectedColor(active ? null : color.name)}
                        className={`snap-start shrink-0 flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-2xl transition-all duration-200 active:scale-[0.97] ${
                          active
                            ? "bg-background border-2 border-foreground shadow-md"
                            : "bg-secondary/70 border-2 border-transparent"
                        }`}
                      >
                        {color.image ? (
                          <img
                            src={color.image}
                            alt={color.name}
                            className="h-11 w-11 rounded-xl object-cover ring-1 ring-black/5 bg-background"
                          />
                        ) : (
                          <span
                            className="h-11 w-11 rounded-xl ring-1 ring-black/10"
                            style={{ backgroundColor: getColorHex(color.name, (product as any).productCode || product.id) }}
                          />
                        )}
                        <div className="flex flex-col items-start pr-0.5">
                          <span className={`text-[13px] leading-tight whitespace-nowrap ${active ? "font-bold text-foreground" : "font-semibold text-muted-foreground"}`}>
                            {color.name}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground/70 leading-tight mt-0.5">
                            Бэлэн байгаа
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Хэмжээ</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    // Per-size stock: if color selected use that color, otherwise sum across colors
                    let sizeQty: number | null = null;
                    if (isElleSportBrand && variantStock) {
                      if (hasColors && selectedColor) {
                        sizeQty = Number(variantStock[`${selectedColor}|${size}`]) || 0;
                      } else if (hasColors) {
                        sizeQty = (product.colors || []).reduce(
                          (sum, c) => sum + (Number(variantStock[`${c.name}|${size}`]) || 0),
                          0
                        );
                      } else {
                        sizeQty = Number(variantStock[`|${size}`]) || 0;
                      }
                    }
                    const isSoldOut = sizeQty !== null && sizeQty <= 0;
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          userInteractedRef.current = true;
                          if (!isSoldOut) setSizeFinderOpenSignal((value) => value + 1);
                        }}
                        disabled={isSoldOut}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors flex flex-col items-center leading-tight min-w-[64px] ${
                          selectedSize === size
                            ? "border-primary bg-primary/10 text-foreground"
                            : isSoldOut
                            ? "border-border bg-secondary/50 text-muted-foreground/50 line-through cursor-not-allowed"
                            : "border-border bg-secondary text-muted-foreground"
                        }`}
                      >
                        <span>{size}</span>
                        {recommendedSize === size && (
                          <span className="text-[9px] font-bold text-primary leading-none mt-0.5">✓ Санал</span>
                        )}
                        {sizeQty !== null && (
                          <span className={`text-[10px] font-normal mt-0.5 ${
                            isSoldOut ? "text-destructive/70" : sizeQty <= 3 ? "text-destructive" : "text-muted-foreground/70"
                          }`}>
                            {isSoldOut ? "Дууссан" : `${sizeQty} ширхэг`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Тоо ширхэг</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl border-2 border-border bg-secondary text-foreground flex items-center justify-center text-lg font-bold"
                >
                  −
                </button>
                <span className="w-12 h-10 flex items-center justify-center text-sm font-semibold text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl border-2 border-border bg-secondary text-foreground flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold"
              onClick={confirmSheet}
              disabled={isOutOfStock}
            >
              {sheetIntent === "buy" ? "Худалдан авах" : "Сагсанд нэмэх"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {/* Spacer so content isn't hidden behind mobile action bar + bottom nav */}
      <div className="h-32 md:hidden" aria-hidden />
      <BottomNav />
    </div>
  );
};


export default ProductPage;
