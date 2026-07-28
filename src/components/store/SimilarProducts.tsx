import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/store/ProductCard";
import { fetchSimilarProductsGrouped } from "@/lib/publicStoreApi";
import { mapDbProduct, type Product } from "@/lib/products";
import { Sparkles, Tag as TagIcon, Store } from "lucide-react";

type Tab = "brandCategory" | "brand" | "category";

interface Props {
  seed: {
    id: string;
    category?: string | null;
    brand_id?: string | null;
    price?: number | null;
    name?: string | null;
  };
  brandName?: string | null;
}

const SimilarProducts = ({ seed, brandName }: Props) => {
  const [data, setData] = useState<{ sameBrand: Product[]; sameCategory: Product[]; brandAndCategory: Product[] } | null>(null);
  const [tab, setTab] = useState<Tab>("brandCategory");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { fetchRecommendationConfig } = await import("@/hooks/useRecommendationWeights");
        const cfg = await fetchRecommendationConfig();
        const res = await fetchSimilarProductsGrouped(seed, { limit: 12, weights: cfg?.related });
        if (cancelled) return;
        setData({
          sameBrand: (res.sameBrand || []).map(mapDbProduct),
          sameCategory: (res.sameCategory || []).map(mapDbProduct),
          brandAndCategory: (res.brandAndCategory || []).map(mapDbProduct),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seed.id, seed.brand_id, seed.category]);

  // Auto-pick initial tab: prefer brandAndCategory, else brand, else category
  useEffect(() => {
    if (!data) return;
    if (data.brandAndCategory.length > 0) setTab("brandCategory");
    else if (data.sameBrand.length > 0) setTab("brand");
    else if (data.sameCategory.length > 0) setTab("category");
  }, [data]);

  const tabs = useMemo(() => {
    if (!data) return [] as Array<{ key: Tab; label: string; count: number; icon: any }>;
    const list: Array<{ key: Tab; label: string; count: number; icon: any }> = [];
    if (data.brandAndCategory.length > 0) {
      list.push({
        key: "brandCategory",
        label: brandName ? `${brandName}-ийн ижил төрөл` : "Ижил брэнд + төрөл",
        count: data.brandAndCategory.length,
        icon: Sparkles,
      });
    }
    if (data.sameBrand.length > 0) {
      list.push({
        key: "brand",
        label: brandName ? `${brandName} брэндийн бусад` : "Ижил брэнд",
        count: data.sameBrand.length,
        icon: Store,
      });
    }
    if (data.sameCategory.length > 0) {
      list.push({
        key: "category",
        label: "Ижил төрлийн бараа",
        count: data.sameCategory.length,
        icon: TagIcon,
      });
    }
    return list;
  }, [data, brandName]);

  if (loading) {
    return (
      <div className="mt-10 md:mt-16">
        <div className="h-6 w-40 bg-secondary rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || tabs.length === 0) return null;

  const items =
    tab === "brandCategory" ? data.brandAndCategory :
    tab === "brand" ? data.sameBrand :
    data.sameCategory;

  if (items.length === 0) return null;

  return (
    <section className="mt-10 md:mt-16">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg md:text-xl font-bold text-foreground">Ижил төстэй бараа</h2>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1 snap-x">
          {tabs.map(({ key, label, count, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs md:text-sm font-semibold border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-background/70"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {items.slice(0, 8).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
};

export default SimilarProducts;
