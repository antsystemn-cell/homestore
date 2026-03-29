import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import LoadError from "@/components/store/LoadError";
import ErrorBoundary from "@/components/store/ErrorBoundary";
import SaleCarousel from "@/components/store/SaleCarousel";
import FeaturedSection from "@/components/store/FeaturedSection";
import { Product, mapDbProduct } from "@/data/products";
import {
  fetchPublicBrands,
  fetchPublicProducts,
  fetchSaleProducts,
  fetchFeaturedProducts,
} from "@/lib/publicStoreApi";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 12;

const Index = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
  const visible = useMemo(
    () => allProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allProducts, page]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setLoading(false);
      setError(true);
    }, 10000);

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

      setAllProducts((prodRes || []).map(mapWithBrand));
      setSaleProducts((saleRes || []).map(mapWithBrand));
      setFeaturedProducts((featuredRes || []).map(mapWithBrand));
      setPage(1);
      setError(false);
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("Failed to load products", err);
        setAllProducts([]);
        setSaleProducts([]);
        setFeaturedProducts([]);
        setError(true);
      }
    } finally {
      clearTimeout(timeout);
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

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      {loading ? (
        <ProductGridSkeleton count={PAGE_SIZE} />
      ) : error ? (
        <LoadError onRetry={fetchAll} retrying={loading} />
      ) : (
        <>
          {/* Sale section */}
          {saleProducts.length > 0 && (
            <ErrorBoundary>
              <SaleCarousel products={saleProducts} />
            </ErrorBoundary>
          )}

          {/* Divider */}
          {saleProducts.length > 0 && featuredProducts.length > 0 && (
            <div className="max-w-6xl mx-auto px-5 md:px-8">
              <div className="h-px bg-outline-variant/30" />
            </div>
          )}

          {/* Featured section */}
          {featuredProducts.length > 0 && (
            <ErrorBoundary>
              <FeaturedSection products={featuredProducts} />
            </ErrorBoundary>
          )}

          {/* All products */}
          {visible.length > 0 && (
            <>
              {/* Divider */}
              <div className="max-w-6xl mx-auto px-5 md:px-8">
                <div className="h-px bg-outline-variant/30" />
              </div>

              <div className="max-w-6xl mx-auto px-5 md:px-8 pt-6 pb-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">
                      Бүх цуглуулга
                    </p>
                    <h2 className="font-display text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                      Бүх бараа
                    </h2>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {allProducts.length} бараа
                  </span>
                </div>
              </div>

              <ErrorBoundary>
                <ProductGrid products={visible} />
              </ErrorBoundary>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 py-8 px-4">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-full bg-surface-container text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
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
                        className={`min-w-[36px] h-9 rounded-full text-sm font-medium transition-colors ${
                          p === page
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface-container text-foreground hover:bg-accent"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-full bg-surface-container text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
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
              <p className="text-lg font-display font-bold">Бараа байхгүй байна</p>
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
