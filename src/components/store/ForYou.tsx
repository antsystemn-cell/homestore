import { useEffect, useState } from "react";
import { Product, mapDbProduct } from "@/data/products";
import { fetchPersonalizedRecommendations } from "@/lib/publicStoreApi";
import { useAuth } from "@/context/AuthContext";
import ProductCard from "./ProductCard";
import ErrorBoundary from "./ErrorBoundary";

const ForYou = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only meaningful for logged-in users (personalization comes from their orders).
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPersonalizedRecommendations(8)
      .then((rows) => {
        if (!cancelled) setItems((rows || []).map(mapDbProduct));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
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
    <section className="mt-6 md:mt-10 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-2xl font-black tracking-tight text-foreground">
            Танд зориулсан
          </h2>
          <span className="text-xs text-muted-foreground">Таны сонирхолд тохирсон</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-5">
          {items.map((p) => (
            <ErrorBoundary key={p.id}>
              <ProductCard product={p} />
            </ErrorBoundary>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ForYou;
