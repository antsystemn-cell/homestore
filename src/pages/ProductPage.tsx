import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react";
import { products, formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/store/BottomNav";

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Бараа олдсонгүй
      </div>
    );
  }

  const liked = isInWishlist(product.id);

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="relative">
        <img src={product.image} alt={product.name} className="w-full aspect-square object-cover bg-secondary" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <button
          onClick={() => toggleWishlist(product)}
          className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm"
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-sale text-sale" : "text-foreground"}`} />
        </button>
        {product.discount && (
          <span className="absolute bottom-4 left-4 bg-sale text-sale-foreground text-xs font-bold px-3 py-1 rounded-full">
            -{product.discount}% хямдрал
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{product.sales} борлуулалт</p>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-primary">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>

        <div className="bg-secondary rounded-xl p-4">
          <h2 className="font-semibold text-foreground mb-2">Тайлбар</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        </div>
      </div>

      <div className="fixed bottom-14 left-0 right-0 bg-card border-t border-border p-3 flex gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => addToCart(product)}
        >
          <ShoppingCart className="h-4 w-4" />
          Сагсанд нэмэх
        </Button>
        <Button
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            addToCart(product);
            navigate("/cart");
          }}
        >
          Худалдаж авах
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductPage;
