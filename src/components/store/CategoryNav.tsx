import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPublicCategories } from "@/lib/publicStoreApi";
import * as Icons from "lucide-react";
import { LayoutGrid } from "lucide-react";

const CategoryNav = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicCategories().then(data => {
      // Only show top-level categories in the nav
      setCategories(data.filter(c => !c.parent_id));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex overflow-x-auto px-4 md:px-8 py-2.5 bg-background border-b border-border no-scrollbar gap-1.5">
      <div className="max-w-6xl mx-auto w-full flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-24 bg-secondary animate-pulse rounded-full shrink-0" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex overflow-x-auto px-4 md:px-8 py-2.5 bg-background border-b border-border no-scrollbar gap-1.5 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto w-full flex items-center gap-1.5">
      {categories.map((c) => {
        const IconComponent = (Icons as any)[c.icon] || LayoutGrid;
        return (
          <button
            key={c.id}
            onClick={() => navigate(`/category/${c.slug}`)}
            className="whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-full transition-all bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <IconComponent className="h-3.5 w-3.5" />
            {c.name}
          </button>
        );
      })}
      <button
        onClick={() => navigate("/shop")}
        className="whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-full transition-all bg-secondary text-muted-foreground hover:bg-accent"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Бүх брэнд
      </button>
      </div>
    </div>
  );
};

export default CategoryNav;