import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import LoadError from "@/components/store/LoadError";
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

const PAGE_SIZE = 20;

const Index = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [visible, setVisible] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 10000);

    try {
      const [prodRes, brandRes] = await Promise.all([
        fetchPublicProducts(),
        fetchPublicBrands(),
      ]);
      const brandMap = new Map((brandRes || []).map((b: any) => [b.id, b]));
      const shuffled = shuffle((prodRes || []).map((row: any) => {
        const p = mapDbProduct(row);
        const brand = brandMap.get(p.brand_id || "");
        if (brand) { p.brandName = brand.name; p.brandLogo = brand.logo_url; }
        return p;
      }));
      setAllProducts(shuffled);
      setVisible(shuffled.slice(0, PAGE_SIZE));
      setHasMore(shuffled.length > PAGE_SIZE);
      setError(false);
    } catch (err) {
      console.error("Failed to load products", err);
      setAllProducts([]);
      setVisible([]);
      setHasMore(false);
      setError(true);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);


  const loadMore = useCallback(() => {
    setVisible((prev) => {
      const next = allProducts.slice(0, prev.length + PAGE_SIZE);
      if (next.length >= allProducts.length) setHasMore(false);
      return next;
    });
  }, [allProducts]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : error ? (
        <LoadError onRetry={fetchAll} retrying={loading} />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">Бараа байхгүй байна</p>
          <p className="text-sm mt-1">Удахгүй шинэ бараа нэмэгдэнэ</p>
        </div>
      ) : (
        <>
          <ProductGrid products={visible} />
          {hasMore && (
            <div ref={loaderRef} className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </>
      )}
      <BottomNav />
    </div>
  );
};

export default Index;
