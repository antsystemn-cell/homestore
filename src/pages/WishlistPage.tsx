import { Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/store/ProductCard";
import BottomNav from "@/components/store/BottomNav";
import { useNavigate } from "react-router-dom";

const WishlistPage = () => {
  const { wishlist } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary pb-20">
      <header className="sticky top-0 z-50 bg-background px-4 py-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Таалагдсан</h1>
      </header>

      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Heart className="h-16 w-16 mb-4 text-border" />
          <p className="text-sm font-medium">Таалагдсан бараа байхгүй</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-sm font-semibold text-foreground underline underline-offset-4"
          >
            Бараа үзэх
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          {wishlist.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default WishlistPage;
