import { Home, Grid3X3, ShoppingCart, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";

const tabs = [
  { path: "/", label: "Нүүр", icon: Home },
  { path: "/cart", label: "Сагс", icon: ShoppingCart },
  { path: "/profile", label: "Профайл", icon: User },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {/* Нүүр */}
        <button
          onClick={() => navigate("/")}
          className={`flex flex-col items-center gap-0.5 ${
            pathname === "/" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Нүүр</span>
        </button>

        {/* Ангилал - center large button */}
        <button
          onClick={() => navigate("/shop")}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-2.5 -mt-5 shadow-lg font-bold text-sm"
        >
          <Grid3X3 className="h-5 w-5" />
          Ангилал
        </button>

        {/* Сагс */}
        <button
          onClick={() => navigate("/cart")}
          className={`flex flex-col items-center gap-0.5 relative ${
            pathname === "/cart" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-sale text-sale-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] font-medium">Сагс</span>
        </button>

        {/* Профайл */}
        <button
          onClick={() => navigate("/profile")}
          className={`flex flex-col items-center gap-0.5 ${
            pathname === "/profile" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Профайл</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
