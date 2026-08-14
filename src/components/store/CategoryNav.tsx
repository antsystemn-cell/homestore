import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { fetchPublicCategories } from "@/lib/publicStoreApi";

const CategoryNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicCategories().then(data => {
      setCategories(data.filter(c => !c.parent_id));
      setLoading(false);
    });
  }, []);

  const activeSlug = location.pathname.startsWith("/category/") ? slug : undefined;
  const isShop = location.pathname === "/shop";

  const shell =
    "sticky top-[57px] md:top-[65px] z-30 bg-background/80 backdrop-blur-xl border-b border-border";

  const buttonBase =
    "shrink-0 flex items-center justify-center px-4 h-9 rounded-full border transition-all duration-200";
  const activeCls =
    "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20";
  const idleCls =
    "bg-card/60 border-transparent text-muted-foreground hover:bg-secondary hover:border-border hover:text-foreground";
  const shopActiveCls = activeCls;
  const shopIdleCls =
    "bg-secondary/60 border-border text-primary hover:bg-primary/10 hover:border-primary/40";

  if (loading) return (
    <div className={shell}>
      <div className="max-w-6xl mx-auto px-3 md:px-8 py-2.5">
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
      <div className="max-w-6xl mx-auto px-3 md:px-8 py-2.5">
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {categories.map((c) => {
              const active = activeSlug === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/category/${c.slug}`)}
                  aria-current={active ? "page" : undefined}
                  className={[buttonBase, active ? activeCls : idleCls].join(" ")}
                >
                  <span className="text-[11px] md:text-[12px] font-semibold tracking-wide whitespace-nowrap">
                    {c.name}
                  </span>
                </button>
              );
            })}

            <div className="h-6 w-px bg-border self-center shrink-0" />

            <button
              onClick={() => navigate("/shop")}
              aria-current={isShop ? "page" : undefined}
              className={[buttonBase, "border-dashed", isShop ? shopActiveCls : shopIdleCls].join(" ")}
            >
              <span className="text-[11px] md:text-[12px] font-bold tracking-wide whitespace-nowrap">
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
