import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import LoadError from "@/components/store/LoadError";
import ErrorBoundary from "@/components/store/ErrorBoundary";
import { Product, mapDbProduct } from "@/data/products";
import { fetchPublicBrands, fetchPublicProducts } from "@/lib/publicStoreApi";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>(searchParams.get("brand") || "all");
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [prodRes, brandRes] = await Promise.all([
        fetchPublicProducts(),
        fetchPublicBrands(),
      ]);
      const brandMap = new Map((brandRes || []).map((b: any) => [b.id, b]));
      setProducts(shuffle((prodRes || []).map((row: any) => {
        const p = mapDbProduct(row);
        const brand = brandMap.get(p.brand_id || "");
        if (brand) { p.brandName = brand.name; p.brandLogo = brand.logo_url; }
        return p;
      })));
      setBrands((brandRes || []).map((b: any) => ({ id: b.id, name: b.name })));
    } catch (err) {
      console.error("Failed to load shop products", err);
      setProducts([]);
      setBrands([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(
    () => selectedBrand === "all" ? products : products.filter((p) => p.brand_id === selectedBrand),
    [products, selectedBrand]
  );

  return (
    <div className="min-h-screen bg-secondary pb-16 md:pb-0">
      <Header />
      {brands.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => { setSelectedBrand("all"); setSearchParams({}); }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedBrand === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:bg-accent"
              }`}
            >
              Бүгд
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => { setSelectedBrand(b.id); setSearchParams({ brand: b.id }); }}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedBrand === b.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground border border-border hover:bg-accent"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : error ? (
        <LoadError onRetry={fetchData} retrying={loading} />
      ) : (
        <ErrorBoundary>
          <ProductGrid title="Бүх бараа" products={filtered} />
        </ErrorBoundary>
      )}
      <BottomNav />
    </div>
  );
};

export default ShopPage;
