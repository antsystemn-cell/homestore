import { Home, ShoppingCart, Heart, User, PlayCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount, wishlist } = useCart();

  const tabs = [
    { path: "/", label: "Нүүр", icon: Home },
    { path: "/wishlist", label: "Таалагдсан", icon: Heart },
    { path: "/reels", label: "Reels", icon: PlayCircle },
    { path: "/cart", label: "Сагс", icon: ShoppingCart, badge: cartCount },
    { path: "/profile", label: "Профайл", icon: User },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom md:hidden">
      <div className="flex justify-around items-stretch h-16 max-w-lg mx-auto px-2">
        {tabs.map((t) => {
          const active = isActive(t.path);
          const Icon = t.icon;

          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors ${
                active ? "text-sale" : "text-muted-foreground"
              }`}
            >
              {/* Top indicator bar for active tab */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all ${
                  active ? "w-8 bg-sale" : "w-0 bg-transparent"
                }`}
                aria-hidden
              />
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform ${
                    active ? "scale-110" : ""
                  } ${
                    t.path === "/wishlist" && wishlist.length > 0
                      ? "fill-sale text-sale"
                      : active
                      ? "fill-sale/15"
                      : ""
                  }`}
                />
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-sale text-sale-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {t.badge}
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
