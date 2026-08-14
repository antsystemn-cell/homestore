import { useEffect, useState } from "react";
import { Product, mapDbProduct } from "@/data/products";
import { fetchPersonalizedRecommendations, fetchPublicBrands } from "@/lib/publicStoreApi";
import { useAuth } from "@/context/AuthContext";
import ProductGrid from "./ProductGrid";
import ErrorBoundary from "./ErrorBoundary";

const ForYou = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string; logo_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only meaningful for logged-in users (personalization comes from their orders).
    if (!user) {
      setItems([]);
      setBrands([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchPersonalizedRecommendations(8),
      fetchPublicBrands(),
    ])
      .then(([rows, brandRes]) => {
        if (cancelled) return;
        const brandMap = new Map((brandRes || []).map((b: any) => [b.id, b]));
        const mapped = (rows || []).map((row: any) => {
          const p = mapDbProduct(row);
          const brand = brandMap.get(p.brand_id || "");
          if (brand) {
            p.brandName = brand.name;
            p.brandLogo = brand.logo_url;
          }
          return p;
        });
        setItems(mapped);
        setBrands((brandRes || []).map((b: any) => ({ id: b.id, name: b.name, logo_url: b.logo_url })));
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setBrands([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || loading || items.length === 0) return null;

  return (
    <section className="mt-6 md:mt-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-baseline justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-2xl font-black tracking-tight text-foreground">
            Танд зориулсан
          </h2>
          <span className="text-xs text-muted-foreground">Таны сонирхолд тохирсон</span>
        </div>
      </div>
      <ErrorBoundary>
        <ProductGrid products={items} brands={brands} allProducts={items} />
      </ErrorBoundary>
    </section>
  );
};

export default ForYou;
