import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";
import ProductGrid from "@/components/store/ProductGrid";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import LoadError from "@/components/store/LoadError";
import ErrorBoundary from "@/components/store/ErrorBoundary";
import { Product, mapDbProduct } from "@/data/products";
import { fetchSaleProducts, fetchPublicBrands } from "@/lib/publicStoreApi";
import { useIsMobile } from "@/hooks/use-mobile";
import { Zap } from "lucide-react";

const MOBILE_LOAD_SIZE = 12;

const SalesPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_LOAD_SIZE);
  const isMobile = useIsMobile();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    if (isMobile) return products.slice(0, mobileVisibleCount);
    return products;
  }, [products, isMobile, mobileVisibleCount]);

  useEffect(() => {
    if (!isMobile || products.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileVisibleCount < products.length) {
          setMobileVisibleCount((prev) => Math.min(prev + MOBILE_LOAD_SIZE, products.length));
        }
      },
      { threshold: 0.1 }
    );
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [isMobile, products.length, mobileVisibleCount]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [saleRes, brandRes] = await Promise.all([
        fetchSaleProducts(),
        fetchPublicBrands(),
      ]);
      const brandMap = new Map((brandRes || []).map((b: any) => [b.id, b]));
      const mapped = (saleRes || []).map((row: any) => {
        const p = mapDbProduct(row);
        const brand = brandMap.get(p.brand_id || "");
        if (brand) {
          p.brandName = brand.name;
          p.brandLogo = brand.logo_url;
        }
        return p;
      });
      setProducts(mapped);
      setError(mapped.length === 0);
    } catch {
      setProducts([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const hasMoreMobile = isMobile && mobileVisibleCount < products.length;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-8">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-destructive to-[hsl(30,100%,50%)] flex items-center justify-center shadow-md">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
            Хямдралтай бараа
          </h1>
        </div>

        {loading ? (
          <ProductGridSkeleton count={12} />
        ) : error ? (
          <LoadError onRetry={fetchAll} retrying={loading} />
        ) : (
          <>
            <ErrorBoundary>
              <ProductGrid products={visible} />
            </ErrorBoundary>

            {hasMoreMobile && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-6">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SalesPage;
