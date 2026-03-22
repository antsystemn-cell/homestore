import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Truck, Shield, RotateCcw } from "lucide-react";
import { Product, formatPrice, mapDbProduct } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/store/BottomNav";
import ProductCard from "@/components/store/ProductCard";

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (data) {
        const p = mapDbProduct(data);
        setProduct(p);
        // Fetch related
        const { data: rel } = await supabase
          .from("products")
          .select("*")
          .eq("category", data.category)
          .neq("id", data.id)
          .limit(4);
        setRelated((rel || []).map(mapDbProduct));
      }
      setLoading(false);
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

      <div className="hidden md:block max-w-6xl mx-auto px-8 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Буцах
        </button>
      </div>

      <div className="max-w-6xl mx-auto md:px-8">
        <div className="md:grid md:grid-cols-2 md:gap-10">
          <div className="relative md:sticky md:top-20 md:self-start">
            <img
              src={product.image}
              alt={product.name}
              className="w-full aspect-square object-cover bg-secondary md:rounded-2xl"
            />
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

          <div className="p-4 md:p-0 space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{product.name}</h1>
              {product.sales && <p className="text-muted-foreground text-sm mt-1">{product.sales} борлуулалт</p>}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl md:text-3xl font-extrabold text-foreground">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="text-muted-foreground line-through text-lg">{formatPrice(product.originalPrice)}</span>
              )}
            </div>

            <div className="hidden md:flex gap-3">
              <Button variant="outline" size="lg" className="flex-1 gap-2 rounded-xl h-12" onClick={() => addToCart(product)}>
                <ShoppingCart className="h-4 w-4" />
                Сагсанд нэмэх
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12"
                onClick={() => { addToCart(product); navigate("/cart"); }}
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
          </div>
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

      <div className="fixed bottom-14 left-0 right-0 bg-card border-t border-border p-3 flex gap-3 md:hidden">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => addToCart(product)}>
          <ShoppingCart className="h-4 w-4" />
          Сагсанд нэмэх
        </Button>
        <Button
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => { addToCart(product); navigate("/cart"); }}
        >
          Худалдаж авах
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductPage;
