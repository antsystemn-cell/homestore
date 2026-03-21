import { Home, Store, ShoppingCart, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";

const tabs = [
  { path: "/", label: "Нүүр", icon: Home },
  { path: "/shop", label: "Дэлгүүр", icon: Store },
  { path: "/cart", label: "Сагс", icon: ShoppingCart },
  { path: "/profile", label: "Профайл", icon: User },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map((t) => {
          const active = pathname === t.path;
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={`flex flex-col items-center gap-0.5 relative ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-5 w-5" />
              {t.path === "/cart" && cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-sale text-sale-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {cartCount}
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
