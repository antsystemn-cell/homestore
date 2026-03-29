import { Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/store/ProductCard";
import BottomNav from "@/components/store/BottomNav";
import Header from "@/components/store/Header";
import { useNavigate } from "react-router-dom";

const WishlistPage = () => {
  const { wishlist } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary pb-20 md:pb-0">
      <header className="sticky top-0 z-50 bg-background px-4 py-4 border-b border-border md:hidden">
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
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default WishlistPage;
