import { Home, ShoppingBag, Compass, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount } = useCart();

  const tabs = [
    { path: "/", label: "Нүүр", icon: Home },
    { path: "/shop", label: "Дэлгүүр", icon: ShoppingBag },
    { path: "/wishlist", label: "Таалагдсан", icon: Compass },
    { path: "/profile", label: "Профайл", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map((t) => {
          const active = pathname === t.path;
          const Icon = t.icon;
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={`flex flex-col items-center gap-0.5 relative transition-colors px-4 py-1 ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.5} />
                {t.path === "/shop" && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-sale text-sale-foreground text-[8px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
