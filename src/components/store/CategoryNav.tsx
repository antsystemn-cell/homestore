import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { fetchPublicCategories } from "@/lib/publicStoreApi";

const CategoryNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetchPublicCategories().then(data => {
      setCategories(data.filter(c => !c.parent_id));
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

  const activeSlug = location.pathname.startsWith("/category/") ? slug : undefined;
  const isShop = location.pathname === "/shop";

  // Brand blue (logo) — vivid, not the near-black primary.
  const shell = scrolled
    ? "sticky top-[49px] md:top-[57px] z-30 bg-transparent backdrop-blur-[2px] border-b border-transparent transition-all duration-300"
    : "sticky top-[57px] md:top-[65px] z-30 bg-background/85 backdrop-blur-xl border-b border-border transition-all duration-300";

  const pad = scrolled ? "px-3 md:px-8 py-1.5" : "px-3 md:px-8 py-2.5";

  const buttonBase = scrolled
    ? "shrink-0 flex items-center justify-center px-3 h-7 rounded-full border transition-all duration-300"
    : "shrink-0 flex items-center justify-center px-4 h-9 rounded-full border transition-all duration-300";

  // Selected category → brand-blue pill (logo color), not black.
  const activeCls =
    "bg-sale border-sale text-sale-foreground shadow-md shadow-sale/25";
  const idleCls =
    "bg-card/60 border-transparent text-muted-foreground hover:bg-secondary hover:border-border hover:text-foreground";
  const shopIdleCls =
    "bg-secondary/60 border-border text-sale hover:bg-sale/10 hover:border-sale/40";

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
        <div className="relative">
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
              onClick={() => navigate("/shop")}
              aria-current={isShop ? "page" : undefined}
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
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent md:hidden" />
        </div>
      </div>
    </div>
  );
};

export default CategoryNav;
