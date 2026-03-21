import { Home, Grid3X3, ShoppingCart, Heart, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount, wishlist } = useCart();

  const tabs = [
    { path: "/", label: "Нүүр", icon: Home },
    { path: "/wishlist", label: "Таалагдсан", icon: Heart },
    { path: "/shop", label: "Ангилал", icon: Grid3X3, center: true },
    { path: "/cart", label: "Сагс", icon: ShoppingCart, badge: cartCount },
    { path: "/profile", label: "Профайл", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((t) => {
          const active = pathname === t.path;
          const Icon = t.icon;

          if (t.center) {
            return (
              <button
                key={t.path}
                onClick={() => navigate(t.path)}
                className="flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-full px-5 py-2.5 -mt-5 shadow-lg font-bold text-xs transition-transform active:scale-95"
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          }

          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={`flex flex-col items-center gap-0.5 relative transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${t.path === "/wishlist" && wishlist.length > 0 ? "fill-sale text-sale" : ""}`} />
              {t.badge !== undefined && t.badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-sale text-sale-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {t.badge}
                </span>
              )}
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
