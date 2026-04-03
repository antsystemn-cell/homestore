import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import LoadError from "@/components/store/LoadError";
import ErrorBoundary from "@/components/store/ErrorBoundary";
import SaleCarousel from "@/components/store/SaleCarousel";
import PromoBanner from "@/components/store/PromoBanner";
import BrandLogos from "@/components/store/BrandLogos";
import { Product, mapDbProduct } from "@/data/products";
import {
  fetchPublicBrands,
  fetchPublicProducts,
  fetchSaleProducts,
  fetchFeaturedProducts,
} from "@/lib/publicStoreApi";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PAGE_SIZE = 20;
const MOBILE_LOAD_SIZE = 12;

const Index = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string; logo_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_LOAD_SIZE);
  const isMobile = useIsMobile();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
  const visible = useMemo(() => {
    if (isMobile) {
      return allProducts.slice(0, mobileVisibleCount);
    }
    return allProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [allProducts, page, isMobile, mobileVisibleCount]);

  // Infinite scroll observer for mobile
  useEffect(() => {
    if (!isMobile || allProducts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileVisibleCount < allProducts.length) {
          setMobileVisibleCount((prev) => Math.min(prev + MOBILE_LOAD_SIZE, allProducts.length));
        }
      },
      { threshold: 0.1 }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [isMobile, allProducts.length, mobileVisibleCount]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const [prodRes, brandRes, saleRes, featuredRes] = await Promise.all([
        fetchPublicProducts(),
        fetchPublicBrands(),
        fetchSaleProducts(),
        fetchFeaturedProducts(),
      ]);
      const brandMap = new Map((brandRes || []).map((b: any) => [b.id, b]));

      const mapWithBrand = (row: any) => {
        const p = mapDbProduct(row);
        const brand = brandMap.get(p.brand_id || "");
        if (brand) {
          p.brandName = brand.name;
          p.brandLogo = brand.logo_url;
        }
        return p;
      };

      const mappedProducts = shuffle((prodRes || []).map(mapWithBrand));
      const mappedSale = (saleRes || []).map(mapWithBrand);
      const mappedFeatured = (featuredRes || []).map(mapWithBrand);

      setAllProducts(mappedProducts);
      setSaleProducts(mappedSale);
      setFeaturedProducts(mappedFeatured);
      setBrands((brandRes || []).map((b: any) => ({ id: b.id, name: b.name, logo_url: b.logo_url })));
      setPage(1);
      setMobileVisibleCount(MOBILE_LOAD_SIZE);
      // Only show error if absolutely no data was loaded
      setError(mappedProducts.length === 0 && mappedSale.length === 0 && mappedFeatured.length === 0);
    } catch (err) {
      console.error("Failed to load products", err);
      setAllProducts([]);
      setSaleProducts([]);
      setFeaturedProducts([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, page]);

  const hasMoreMobile = isMobile && mobileVisibleCount < allProducts.length;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      {loading ? (
        <ProductGridSkeleton count={PAGE_SIZE} />
      ) : error ? (
        <LoadError onRetry={fetchAll} retrying={loading} />
      ) : (
        <>
          {/* Promo banner */}
          <ErrorBoundary>
            <PromoBanner />
          </ErrorBoundary>

          {/* Brand logos */}
          {brands.length > 0 && (
            <ErrorBoundary>
              <BrandLogos brands={brands} />
            </ErrorBoundary>
          )}

          {/* Sale carousel - below brands */}
          {saleProducts.length > 0 && (
            <ErrorBoundary>
              <SaleCarousel products={saleProducts} />
            </ErrorBoundary>
          )}

          {visible.length > 0 && (
            <>

              <ErrorBoundary>
                <ProductGrid products={visible} />
              </ErrorBoundary>

              {/* Mobile: infinite scroll trigger */}
              {hasMoreMobile && (
                <div ref={loadMoreRef} className="flex items-center justify-center py-6">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}

              {/* Desktop: pagination */}
              {!isMobile && totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 py-6 px-4">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-secondary text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                    aria-label="Өмнөх хуудас"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {pageNumbers.map((p, i) =>
                    typeof p === "string" ? (
                      <span key={`dots-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                          p === page
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground hover:bg-accent"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg bg-secondary text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                    aria-label="Дараагийн хуудас"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {visible.length === 0 && saleProducts.length === 0 && featuredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-lg font-medium">Бараа байхгүй байна</p>
              <p className="text-sm mt-1">Удахгүй шинэ бараа нэмэгдэнэ</p>
            </div>
          )}
        </>
      )}
      <BottomNav />
    </div>
  );
};

export default Index;