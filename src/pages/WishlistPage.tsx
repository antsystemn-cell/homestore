import { Heart, ShoppingCart, ChevronDown, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/store/ProductCard";
import BottomNav from "@/components/store/BottomNav";
import Header from "@/components/store/Header";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const WishlistPage = () => {
  const { wishlist, addToCart } = useCart();
  const navigate = useNavigate();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { color?: string, size?: string }>>({});

  const handleAddToCart = (product: any) => {
    const variant = selectedVariants[product.id];
    
    // If product has sizes but none selected, show toast
    if (product.sizes?.length > 0 && !variant?.size) {
      toast.error("Хэмжээ сонгоно уу");
      return;
    }

    setAddingToCart(product.id);
    addToCart(product, variant?.color || null, variant?.size || null, 1);
    toast.success("Сагсанд нэмэгдлээ");
    
    setTimeout(() => setAddingToCart(null), 1000);
  };

  const handleVariantChange = (productId: string, type: 'color' | 'size', value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [type]: value
      }
    }));
  };

  return (
    <div className="min-h-screen bg-secondary pb-20 md:pb-0">
      <Header />
      <header className="sticky top-0 z-50 bg-background px-4 py-4 border-b border-border md:hidden hidden">
        <h1 className="text-lg font-bold text-foreground">Таалагдсан</h1>
      </header>

      <div className="max-w-6xl mx-auto md:py-10 md:px-8">
        <div className="hidden md:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Таалагдсан</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {wishlist.length > 0 ? `${wishlist.length} бараа хадгалсан` : "Хадгалсан бараа байхгүй"}
            </p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="h-20 w-20 rounded-full bg-secondary md:bg-background flex items-center justify-center mb-6">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Таалагдсан бараа байхгүй</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 bg-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              Бараа үзэх
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 md:px-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {wishlist.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <ProductCard product={p} />
                
                {/* Variant Selectors & Add to Cart */}
                <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-3 shadow-sm">
                  {/* Size Selector */}
                  {p.sizes && p.sizes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.sizes.map((size: string) => (
                        <button
                          key={size}
                          onClick={() => handleVariantChange(p.id, 'size', size)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                            selectedVariants[p.id]?.size === size
                              ? "bg-primary text-primary-foreground ring-1 ring-primary"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(p)}
                    disabled={addingToCart === p.id}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {addingToCart === p.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    {addingToCart === p.id ? "Нэмэгдлээ" : "Сагсанд нэмэх"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default WishlistPage;
