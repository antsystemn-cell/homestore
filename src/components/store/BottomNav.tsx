import { Home, Heart, User } from "lucide-react";

const ReelsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="white" />
    <path d="M2.5 7.5 L7 2.5 L11 2.5 L6.5 7.5 Z" fill="#F59E0B" />
    <path d="M8 7.5 L12.5 2.5 L16.5 2.5 L12 7.5 Z" fill="#EC4899" />
    <path d="M13.5 7.5 L18 2.5 L21.5 2.5 L21.5 5 L18 7.5 Z" fill="#A855F7" />
    <path d="M10 11.5 L16 14.5 L10 17.5 Z" fill="#F43F5E" />
  </svg>
);
import { useNavigate, useLocation } from "react-router-dom";


const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  

  const tabs = [
    { path: "/", label: "Нүүр", icon: Home },
    { path: "/reels", label: "Reels", icon: ReelsIcon },
    { path: "/wishlist", label: "Хадгалсан", icon: Heart },
    { path: "/profile/details", label: "Профайл", icon: User },
  ];


  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-card/95 backdrop-blur-md border-t border-border safe-bottom md:hidden">
      <div className="flex justify-around items-stretch h-16 max-w-lg mx-auto px-4">
        {tabs.map((t) => {
          const active = isActive(t.path);
          const Icon = t.icon;
          const isReels = t.path === "/reels";
          const isProductPage = pathname.startsWith("/product/");

          if (isReels) {
            // On product detail pages, render a flat inline variant so the
            // protruding FAB doesn't collide with the sticky action bar above.
            if (isProductPage) {
              return (
                <button
                  key={t.path}
                  onClick={() => navigate(t.path)}
                  className="relative flex flex-col items-center justify-center gap-0.5 flex-1"
                  aria-label="Reels"
                >
                  <div className="relative flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-tr from-fuchsia-600 via-rose-500 to-amber-400 shadow-sm">
                    <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
                  </div>
                  <span className="text-[10px] font-bold bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                    Reels
                  </span>
                </button>
              );
            }
            return (
              <button
                key={t.path}
                onClick={() => navigate(t.path)}
                className="relative flex flex-col items-center justify-end flex-1 -mt-6"
                aria-label="Reels"
              >
                <span className="absolute inset-x-0 -top-6 flex justify-center pointer-events-none">
                  <span className="relative flex h-14 w-14 items-center justify-center">
                    {/* pulsing halo */}
                    <span className="absolute inset-0 rounded-full bg-sale/40 animate-ping" />
                    <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 blur-[6px] opacity-70" />
                    {/* solid gradient button */}
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-600 via-rose-500 to-amber-400 shadow-[0_8px_24px_-4px_rgba(244,63,94,0.6)] ring-4 ring-card">
                      <Icon className="h-7 w-7 text-white drop-shadow" strokeWidth={2.25} />
                    </span>
                    {/* LIVE dot */}
                    <span className="absolute top-0 right-0 flex h-3 w-3">
                      <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 ring-2 ring-card" />
                    </span>
                  </span>
                </span>
                <span
                  className={`mb-1.5 text-[10px] font-extrabold tracking-wide bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 bg-clip-text text-transparent`}
                >
                  Reels
                </span>
              </button>
            );
          }

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
                    active ? "scale-110 fill-sale/15" : ""
                  }`}
                />


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
