import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { fetchPublicBrands } from "@/lib/publicStoreApi";

/**
 * Sticky brand selector that mirrors the CategoryNav pill style.
 * Shown on brand pages so the top looks consistent with the category bar.
 */
const BrandNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { brandName } = useParams<{ brandName?: string }>();
  const [brands, setBrands] = useState<{ id: string; name: string; logo_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetchPublicBrands().then((data) => {
      setBrands((data || []).map((b: any) => ({ id: b.id, name: b.name, logo_url: b.logo_url })));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const decoded = brandName ? decodeURIComponent(brandName) : "";
  const activeId = brands.find(
    (b) => b.name === decoded || b.name.replace(/\s+/g, "") === decoded
  )?.id;

  const shell = scrolled
    ? "sticky top-[49px] md:top-[57px] z-30 bg-transparent backdrop-blur-[2px] border-b border-transparent transition-all duration-300"
    : "sticky top-[57px] md:top-[65px] z-30 bg-background/85 backdrop-blur-xl border-b border-border transition-all duration-300";

  const pad = scrolled ? "px-3 md:px-8 py-1.5" : "px-3 md:px-8 py-2.5";

  const buttonBase = scrolled
    ? "shrink-0 flex items-center gap-1.5 justify-center px-2 h-8 rounded-full border transition-all duration-300"
    : "shrink-0 flex items-center gap-1.5 justify-center px-2.5 h-10 rounded-full border transition-all duration-300";

  const activeCls =
    "bg-sale border-sale text-sale-foreground shadow-md shadow-sale/25";
  const idleCls =
    "bg-card/60 border-transparent hover:bg-secondary hover:border-border";
  const allIdleCls =
    "bg-secondary/60 border-border border-dashed text-sale hover:bg-sale/10 hover:border-sale/40";

  if (loading) return (
    <div className={shell}>
      <div className={`max-w-6xl mx-auto ${pad}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-9 w-16 bg-secondary animate-pulse rounded-full shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );

  const logoBox = scrolled ? "h-5 w-5" : "h-6 w-6";

  return (
    <div className={shell}>
      <div className={`max-w-6xl mx-auto ${pad}`}>
        <div className="relative">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => navigate("/shop")}
              aria-current={!activeId ? "page" : undefined}
              className={[buttonBase, !activeId ? activeCls : allIdleCls].join(" ")}
            >
              <span
                className={[
                  "font-bold tracking-tight whitespace-nowrap",
                  scrolled ? "text-[10px] md:text-[11px]" : "text-[11px] md:text-[12px]",
                ].join(" ")}
              >
                Бүгд
              </span>
            </button>

            {brands.map((b) => {
              const active = activeId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => navigate(`/${b.name.replace(/\s+/g, "")}`)}
                  aria-current={active ? "page" : undefined}
                  className={[buttonBase, active ? activeCls : idleCls].join(" ")}
                >
                  <div className={`${logoBox} rounded-md bg-background/80 border border-border/60 flex items-center justify-center overflow-hidden shrink-0`}>
                    {b.logo_url ? (
                      <img src={b.logo_url} alt="" className="h-full w-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[8px] font-bold text-muted-foreground">{b.name.slice(0, 2)}</span>
                    )}
                  </div>
                  <span
                    className={[
                      "font-semibold tracking-tight whitespace-nowrap",
                      scrolled ? "text-[10px] md:text-[11px]" : "text-[11px] md:text-[12px]",
                      active ? "text-sale-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    {b.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent md:hidden" />
        </div>
      </div>
    </div>
  );
};

export default BrandNav;
