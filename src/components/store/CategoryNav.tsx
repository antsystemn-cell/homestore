import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { fetchPublicCategories } from "@/lib/publicStoreApi";
import * as Icons from "lucide-react";
import { LayoutGrid } from "lucide-react";

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

  if (loading) return (
    <div className={shell}>
      <div className="max-w-6xl mx-auto px-3 md:px-8 py-2.5">
        <div className="flex items-center gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[62px] w-[86px] bg-secondary animate-pulse rounded-xl shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={shell}>
      <div className="max-w-6xl mx-auto px-3 md:px-8 py-2.5">
        <div className="relative">
          <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {categories.map((c) => {
              const IconComponent = (Icons as any)[c.icon] || LayoutGrid;
              const active = activeSlug === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/category/${c.slug}`)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group shrink-0 w-[88px] flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border transition-all duration-200",
                    active
                      ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card/60 border-transparent text-muted-foreground hover:bg-secondary hover:border-border hover:text-foreground",
                  ].join(" ")}
                >
                  <IconComponent className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] md:text-[11px] font-semibold tracking-wide whitespace-nowrap">
                    {c.name}
                  </span>
                </button>
              );
            })}

            <div className="h-10 w-px bg-border self-center shrink-0" />

            <button
              onClick={() => navigate("/shop")}
              className={[
                "shrink-0 w-[88px] flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed transition-all duration-200",
                isShop
                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-secondary/60 border-border text-primary hover:bg-primary/10 hover:border-primary/40",
              ].join(" ")}
            >
              <LayoutGrid className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] md:text-[11px] font-bold tracking-wide whitespace-nowrap">
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
