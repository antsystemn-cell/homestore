import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import LoadError from "@/components/store/LoadError";
import ErrorBoundary from "@/components/store/ErrorBoundary";
import BrandBanner from "@/components/store/BrandBanner";
import WestinghouseHeader from "@/components/store/WestinghouseHeader";
import EllehomeHeader from "@/components/store/EllehomeHeader";
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
  const { brandName: brandParam } = useParams<{ brandName?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<{ id: string; name: string; logo_url?: string | null }[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [error, setError] = useState(false);
  const [sortBy, setSortBy] = useState<string>("default");

  // Resolve brand name from URL to brand id after brands load
  useEffect(() => {
    const urlBrand = brandParam || searchParams.get("brand");
    if (!urlBrand) {
      setSelectedBrand("all");
    } else if (brands.length > 0) {
      const decoded = decodeURIComponent(urlBrand);
      const match = brands.find((b) => b.name === decoded || b.name.replace(/\s+/g, '') === decoded);
      if (match) setSelectedBrand(match.id);
    }
  }, [brands, searchParams, brandParam]);

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
      setBrands((brandRes || []).map((b: any) => ({ id: b.id, name: b.name, logo_url: b.logo_url })));
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

  const filtered = useMemo(() => {
    if (selectedBrand === "all") return products;
    const list = products.filter((p) => p.brand_id === selectedBrand);
    const sorted = [...list].sort((a, b) => {
      const ap = a.brand_position;
      const bp = b.brand_position;
      if (ap == null && bp == null) return 0;
      if (ap == null) return 1;
      if (bp == null) return -1;
      return ap - bp;
    });
    switch (sortBy) {
      case "name-asc":
        return [...sorted].sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return [...sorted].sort((a, b) => b.name.localeCompare(a.name));
      case "price-asc":
        return [...sorted].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...sorted].sort((a, b) => b.price - a.price);
      default:
        return sorted;
    }
  }, [products, selectedBrand, sortBy]);

  const selectedBrandObj = useMemo(
    () => brands.find((b) => b.id === selectedBrand),
    [brands, selectedBrand]
  );
  const isWestinghouse = selectedBrandObj?.name?.toLowerCase() === "westinghouse";

  return (
    <div className="min-h-screen bg-secondary pb-16 md:pb-0">
      {isWestinghouse ? (
        <WestinghouseHeader logoUrl={selectedBrandObj?.logo_url} />
      ) : (
        <>
          <Header />
          {selectedBrand !== "all" && (
            <BrandBanner logoUrl={selectedBrandObj?.logo_url} />
          )}
        </>
      )}
      {brands.length > 0 && selectedBrand === "all" && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => { setSelectedBrand("all"); navigate("/shop"); }}
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
                onClick={() => { setSelectedBrand(b.id); navigate(`/${b.name.replace(/\s+/g, '')}`); }}
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
