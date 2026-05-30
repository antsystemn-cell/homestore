import { useEffect, useState } from "react";
import { Product, mapDbProduct } from "@/data/products";
import { fetchCartRecommendations } from "@/lib/publicStoreApi";
import type { ScoreWeights } from "@/lib/recommendations";
import ProductCard from "./ProductCard";
import ErrorBoundary from "./ErrorBoundary";

interface Props {
  items: Array<{
    product: Pick<Product, "id" | "category" | "brand_id" | "price" | "name">;
  }>;
  weights?: Partial<ScoreWeights>;
}

const CartRecommendations = ({ items }: Props) => {
  const [recs, setRecs] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Build a stable signature so we don't refetch on unrelated re-renders
  const signature = items.map((i) => i.product.id).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (items.length === 0) {
        setRecs([]);
        return;
      }
      setLoading(true);
      try {
        const seeds = items.map((i) => ({
          id: i.product.id,
          category: i.product.category ?? null,
          brand_id: i.product.brand_id ?? null,
          price: i.product.price ?? null,
          name: i.product.name ?? null,
        }));
        const rows = await fetchCartRecommendations(seeds, 8);
        if (!cancelled) setRecs((rows || []).map(mapDbProduct));
      } catch {
        if (!cancelled) setRecs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!loading && recs.length === 0) return null;

  return (
    <div className="mt-8 md:mt-12">
      <h2 className="text-base md:text-lg font-bold text-foreground mb-3 md:mb-4">
        Танд санал болгох
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 md:gap-5">
        {recs.map((p) => (
          <ErrorBoundary key={p.id}>
            <ProductCard product={p} />
          </ErrorBoundary>
        ))}
      </div>
    </div>
  );
};

export default CartRecommendations;
