import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Truck, Shield, RotateCcw, ChevronLeft, ChevronRight, Play, Gift } from "lucide-react";
import { Product, formatPrice, mapDbProduct, DetailMedia } from "@/data/products";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/store/ProductCard";
import ProductReviews from "@/components/store/ProductReviews";
import LoadError from "@/components/store/LoadError";
import { fetchPublicProductBySlug, fetchPublicProductById, fetchPublicProductImages, fetchRelatedPublicProducts, fetchPublicBrands } from "@/lib/publicStoreApi";
import Header from "@/components/store/Header";

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
  const [selectedGiftPackageId, setSelectedGiftPackageId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState<number | null>(null);
  const [variantStock, setVariantStock] = useState<Record<string, number>>({});
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const userInteractedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const scrollSyncTimerRef = useRef<number | null>(null);

  // Number of color variants with images — controls auto-scroll behavior
  const colorImageCount = (product?.colors || []).filter((c) => !!c.image).length;
  const shouldAutoScroll =
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
    addToCart(product!, selectedColor, selectedSize, quantity, chosenPackage);
    setQuantity(1);
    if (andNavigate) {
      navigate("/cart");
    } else {
      toast.success("Сагсанд амжилттай нэмлээ 🛒");
    }
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

          const rel = await fetchRelatedPublicProducts(data.category, data.id, {
            brandId: data.brand_id ?? null,
            price: data.price ?? null,
            name: data.name ?? null,
            limit: 8,
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
    <div className="min-h-screen bg-background pb-32 md:pb-12">
      <div className="hidden md:block"><Header /></div>
      <div className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground truncate">{product.name}</span>
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
        <div className="md:grid md:grid-cols-2 md:gap-10">
          <div className="relative md:sticky md:top-20 md:self-start space-y-4">
            {/* Main product image */}
            <div className="relative">
              <div
                ref={galleryRef}
                className="w-full aspect-square overflow-x-auto flex snap-x snap-mandatory no-scrollbar bg-secondary md:rounded-2xl scroll-smooth"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
                  if (!isProgrammaticScrollRef.current) {
                    userInteractedRef.current = true;
                  }
                  if (i !== activeImg && i >= 0 && i < allImages.length) {
                    setActiveImg(i);
                  }
                }}
                onTouchStart={() => { userInteractedRef.current = true; }}
                onPointerDown={() => { userInteractedRef.current = true; }}
              >
                {(allImages.length > 0 ? allImages : [product.image]).map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`${product.name}${idx > 0 ? ` - ${idx + 1}` : ""}`}
                    className="w-full h-full flex-shrink-0 object-cover snap-start"
                    style={{ minWidth: "100%" }}
                    loading={idx === 0 ? "eager" : "lazy"}
                    draggable={false}
                  />
                ))}
              </div>
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      userInteractedRef.current = true;
                      setActiveImg((i) => (i - 1 + allImages.length) % allImages.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      userInteractedRef.current = true;
                      setActiveImg((i) => (i + 1) % allImages.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-foreground" />
                  </button>
                </>
              )}
              <button
                onClick={() => toggleWishlist(product)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-sale text-sale" : "text-foreground"}`} />
              </button>
              {product.discount ? (
                <span className="absolute bottom-4 left-4 bg-sale text-sale-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                  -{product.discount}% хямдрал
                </span>
              ) : null}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 px-4 md:px-0 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => { userInteractedRef.current = true; setActiveImg(idx); }}
                    className={`h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                      idx === activeImg ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 md:p-0 space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{product.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {product.productCode ? (
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">#{product.productCode}</span>
                ) : null}
                {product.sales ? <p className="text-muted-foreground text-sm">{product.sales} борлуулалт</p> : null}
              </div>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl md:text-3xl font-extrabold text-foreground">{formatPrice(product.price)}</span>
              {product.originalPrice ? (
                <span className="text-muted-foreground line-through text-lg">{formatPrice(product.originalPrice)}</span>
              ) : null}
              {product.isBogo ? (
                <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg">1+1 Үнэгүй</span>
              ) : null}
            </div>

            {/* Gift packages */}
            {product.giftPackages && product.giftPackages.length > 0 && (() => {
              const singlePackage = product.giftPackages.length === 1;
              return (
              <div className="bg-accent/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-accent-foreground" />
                    <span>{singlePackage ? "🎁 Дагалдах бэлэг" : "🎁 Бэлгийн багцаа сонгоно уу"}</span>
                  </div>
                  {!singlePackage && selectedGiftPackageId && (
                    <button
                      type="button"
                      onClick={() => setSelectedGiftPackageId(null)}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground underline"
                    >
                      Цэвэрлэх
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {product.giftPackages.map((pkg) => {
                    const active = selectedGiftPackageId === pkg.id;
                    const interactive = !singlePackage;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        disabled={!interactive}
                        onClick={() => interactive && setSelectedGiftPackageId(active ? null : pkg.id)}
                        className={`flex flex-col gap-2 rounded-lg p-3 border-2 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-primary/40"
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
                              <div key={gift.product_id} className="flex items-center gap-1.5 bg-secondary rounded-md px-1.5 py-1">
                                {gift.image ? (
                                  <img src={gift.image} alt={gift.name} className="w-6 h-6 rounded object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                                    <Gift className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="text-[11px] text-foreground line-clamp-1 max-w-[120px]">{gift.name}</span>
                              </div>
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

            {/* Color selector */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Өнгө</h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => {
                        const newColor = selectedColor === color.name ? null : color.name;
                        setSelectedColor(newColor);
                        if (newColor && color.image) {
                          setActiveImg(0);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                        selectedColor === color.name
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {color.image && (
                        <img src={color.image} alt={color.name} className="h-6 w-6 rounded-md object-cover" />
                      )}
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Хэмжээ</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                        selectedSize === size
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity selector */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Тоо ширхэг</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl border-2 border-border bg-secondary text-foreground flex items-center justify-center text-lg font-bold hover:border-primary/40 transition-colors"
                >
                  −
                </button>
                <span className="w-12 h-10 flex items-center justify-center text-sm font-semibold text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-xl border-2 border-border bg-secondary text-foreground flex items-center justify-center text-lg font-bold hover:border-primary/40 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="hidden md:flex gap-3">
              <Button variant="outline" size="lg" disabled={isOutOfStock} className="flex-1 gap-2 rounded-xl h-12" onClick={() => handleAddToCart()}>
                <ShoppingCart className="h-4 w-4" />
                {isOutOfStock ? "Дууссан" : "Сагсанд нэмэх"}
              </Button>
              <Button
                size="lg"
                disabled={isOutOfStock}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12"
                onClick={() => handleAddToCart(true)}
              >
                {isOutOfStock ? "Дууссан" : "Худалдаж авах"}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1.5 bg-secondary rounded-xl p-3 md:p-4">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground text-center">Хүргэлттэй</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 bg-secondary rounded-xl p-3 md:p-4">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground text-center">Баталгаатай</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 bg-secondary rounded-xl p-3 md:p-4">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground text-center">Буцаалттай</span>
              </div>
            </div>

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
                      ) : (
                        <VideoWithThumbnail media={media} />
                      )}
                      {media.caption && (
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

        {related.length > 0 && (
          <div className="mt-10 md:mt-16 px-4 md:px-0 pb-4">
            <h2 className="text-lg font-bold text-foreground mb-4">Төстэй бараа</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 md:gap-5">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-3 safe-bottom flex gap-2 md:hidden z-50">
        <button
          onClick={() => toggleWishlist(product)}
          className={`flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all ${
            liked ? "border-sale bg-sale/10" : "border-border bg-secondary hover:border-primary/40"
          }`}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-sale text-sale" : "text-muted-foreground"}`} />
        </button>
        <Button variant="outline" disabled={isOutOfStock} className="flex-1 gap-2 rounded-2xl h-12 font-bold text-xs border-2" onClick={() => handleAddToCart()}>
          <ShoppingCart className="h-4 w-4" />
          {isOutOfStock ? "Дууссан" : "Сагсанд"}
        </Button>
        <Button
          disabled={isOutOfStock}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12 font-bold text-xs shadow-lg"
          onClick={() => handleAddToCart(true)}
        >
          {isOutOfStock ? "Дууссан" : "Шууд авах"}
        </Button>
      </div>
    </div>
  );
};

export default ProductPage;
