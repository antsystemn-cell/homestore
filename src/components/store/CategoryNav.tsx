import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { fetchPublicCategories, fetchPublicBrands } from "@/lib/publicStoreApi";

const CategoryNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string; logo_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [showBrands, setShowBrands] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchPublicCategories(), fetchPublicBrands()]).then(([cats, brs]) => {
      setCategories((cats || []).filter((c: any) => !c.parent_id));
      setBrands((brs || []).map((b: any) => ({ id: b.id, name: b.name, logo_url: b.logo_url })));
      setLoading(false);
    });
  }, []);

  // Shrink + fade to transparent when the page scrolls down.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close brands dropdown on outside click / navigation
  useEffect(() => { setShowBrands(false); }, [location.pathname]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setShowBrands(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeSlug = location.pathname.startsWith("/category/") ? slug : undefined;
  const isShop = location.pathname === "/shop";

  const shell = scrolled
    ? "sticky top-[49px] md:top-[57px] z-30 bg-transparent backdrop-blur-[2px] border-b border-transparent transition-all duration-300"
    : "sticky top-[57px] md:top-[65px] z-30 bg-background/85 backdrop-blur-xl border-b border-border transition-all duration-300";

  const pad = scrolled ? "px-3 md:px-8 py-1.5" : "px-3 md:px-8 py-2.5";

  const buttonBase = scrolled
    ? "shrink-0 flex items-center justify-center px-3 h-7 rounded-full border transition-all duration-300"
    : "shrink-0 flex items-center justify-center px-4 h-9 rounded-full border transition-all duration-300";

  const activeCls =
    "bg-sale border-sale text-sale-foreground shadow-md shadow-sale/25";
  const idleCls =
    "bg-card/60 border-transparent text-muted-foreground hover:bg-secondary hover:border-border hover:text-foreground";
  const shopIdleCls =
    "bg-secondary/60 border-border text-sale hover:bg-sale/10 hover:border-sale/40";

  const goBrand = (name: string) => {
    setShowBrands(false);
    navigate(`/${name.replace(/\s+/g, "")}`);
  };

  if (loading) return (
    <div className={shell}>
      <div className={`max-w-6xl mx-auto ${pad}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-9 w-20 bg-secondary animate-pulse rounded-full shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={shell}>
      <div className={`max-w-6xl mx-auto ${pad}`}>
        <div className="relative" ref={navRef}>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {categories.map((c) => {
              const active = activeSlug === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/category/${c.slug}`)}
                  aria-current={active ? "page" : undefined}
                  className={[buttonBase, active ? activeCls : idleCls].join(" ")}
                >
                  <span
                    className={[
                      "font-semibold tracking-tight whitespace-nowrap",
                      scrolled ? "text-[10px] md:text-[11px]" : "text-[11px] md:text-[12px]",
                    ].join(" ")}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}

            <div className="h-5 w-px bg-border/70 self-center shrink-0 mx-0.5" />

            <button
              onClick={() => setShowBrands((v) => !v)}
              aria-current={isShop ? "page" : undefined}
              aria-expanded={showBrands}
              className={[buttonBase, "border-dashed", isShop ? activeCls : shopIdleCls].join(" ")}
            >
              <span
                className={[
                  "font-bold tracking-tight whitespace-nowrap",
                  scrolled ? "text-[10px] md:text-[11px]" : "text-[11px] md:text-[12px]",
                ].join(" ")}
              >
                Бүх брэнд
              </span>
            </button>
          </div>

          {showBrands && (
            <div className="absolute top-full right-0 mt-2 w-[min(92vw,420px)] bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-tight text-foreground">Брэндүүд</span>
                <button
                  onClick={() => { setShowBrands(false); navigate("/shop"); }}
                  className="text-[10px] font-semibold text-sale hover:underline"
                >
                  Бүгдийг үзэх
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3 grid grid-cols-4 gap-2">
                {brands.length === 0 && (
                  <div className="col-span-4 py-6 text-center text-[11px] text-muted-foreground">Брэнд олдсонгүй</div>
                )}
                {brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => goBrand(b.name)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-transparent hover:border-border hover:bg-secondary/40 transition-all group"
                  >
                    <div className="h-11 w-11 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform shrink-0">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt="" className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground">{b.name.slice(0, 2)}</span>
                      )}
                    </div>
                    <span className="text-[9px] font-semibold text-center text-muted-foreground group-hover:text-foreground leading-tight line-clamp-2">
                      {b.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showBrands && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent md:hidden" />
          )}
        </div>

      </div>
    </div>
  );
};

export default CategoryNav;
