import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Truck, Shield, RotateCcw, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Product, formatPrice, mapDbProduct, DetailMedia } from "@/data/products";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/store/ProductCard";
import ProductReviews from "@/components/store/ProductReviews";
import { fetchPublicProductById, fetchPublicProductImages, fetchRelatedPublicProducts } from "@/lib/publicStoreApi";

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
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = (andNavigate?: boolean) => {
    if (product?.colors && product.colors.length > 0 && !selectedColor) {
      toast.error("Өнгөө сонгоно уу");
      return;
    }
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error("Хэмжээгээ сонгоно уу");
      return;
    }
    addToCart(product!, selectedColor, selectedSize, quantity);
    setQuantity(1);
    if (andNavigate) navigate("/cart");
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        if (!id) throw new Error("Missing product id");
        const rows = await fetchPublicProductById(id);
        const data = rows?.[0];

        if (data) {
          const p = mapDbProduct(data);
          setProduct(p);

          const imgs = await fetchPublicProductImages(data.id);
          const extras = (imgs || []).map((r: any) => r.image_url);
          setAllImages([p.image, ...extras]);
          setActiveImg(0);

          const rel = await fetchRelatedPublicProducts(data.category, data.id);
          setRelated((rel || []).map(mapDbProduct));
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Failed to load product", error);
        setProduct(null);
        setAllImages([]);
        setRelated([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Уншиж байна...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Бараа олдсонгүй
      </div>
    );
  }

  const liked = isInWishlist(product.id);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-12">
      <div className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground truncate">{product.name}</span>
      </div>

      <div className="hidden md:block sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
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
              {(() => {
                const colorImg = selectedColor && product.colors?.find(c => c.name === selectedColor)?.image;
                const displayImg = colorImg || allImages[activeImg] || product.image;
                return <img src={displayImg} alt={product.name} className="w-full aspect-square object-cover bg-secondary md:rounded-2xl" />;
              })()}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-foreground" />
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => (i + 1) % allImages.length)}
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
              {product.discount && (
                <span className="absolute bottom-4 left-4 bg-sale text-sale-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                  -{product.discount}% хямдрал
                </span>
              )}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 px-4 md:px-0 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(idx)}
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
                {product.productCode && (
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">#{product.productCode}</span>
                )}
                {product.sales && <p className="text-muted-foreground text-sm">{product.sales} борлуулалт</p>}
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl md:text-3xl font-extrabold text-foreground">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="text-muted-foreground line-through text-lg">{formatPrice(product.originalPrice)}</span>
              )}
            </div>

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
              <Button variant="outline" size="lg" className="flex-1 gap-2 rounded-xl h-12" onClick={() => handleAddToCart()}>
                <ShoppingCart className="h-4 w-4" />
                Сагсанд нэмэх
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12"
                onClick={() => handleAddToCart(true)}
              >
                Худалдаж авах
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
        <Button variant="outline" className="flex-1 gap-2 rounded-2xl h-12 font-bold text-xs border-2" onClick={() => handleAddToCart()}>
          <ShoppingCart className="h-4 w-4" />
          Сагсанд
        </Button>
        <Button
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12 font-bold text-xs shadow-lg"
          onClick={() => handleAddToCart(true)}
        >
          Шууд авах
        </Button>
      </div>
    </div>
  );
};

export default ProductPage;
