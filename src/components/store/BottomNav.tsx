import { Home, Search, Heart, ShoppingBag, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount, wishlist } = useCart();

  const tabs = [
    { path: "/", label: "Нүүр", icon: Home },
    { path: "/shop", label: "Хайх", icon: Search },
    { path: "/wishlist", label: "Таалагдсан", icon: Heart },
    { path: "/cart", label: "Сагс", icon: ShoppingBag, badge: cartCount },
    { path: "/profile", label: "Профайл", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
      {/* Glassmorphism background */}
      <div className="mx-4 mb-3 rounded-2xl bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center h-14 px-2">
          {tabs.map((t) => {
            const active = pathname === t.path;
            const Icon = t.icon;

            return (
              <button
                key={t.path}
                onClick={() => navigate(t.path)}
                className={`flex flex-col items-center gap-0.5 relative transition-all duration-200 px-3 py-1 ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] transition-all ${
                    active ? "stroke-[2.5]" : "stroke-[1.5]"
                  } ${t.path === "/wishlist" && wishlist.length > 0 ? "fill-sale text-sale" : ""}`}
                />
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="absolute -top-0.5 right-0 bg-secondary text-secondary-foreground text-[8px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                    {t.badge}
                  </span>
                )}
                <span className={`text-[9px] uppercase tracking-wider ${active ? "font-semibold" : "font-medium"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
