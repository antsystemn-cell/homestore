import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import LoadError from "@/components/store/LoadError";
import { Product, mapDbProduct } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

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
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError(true);
      }
    }, 10000);

    try {
      const [prodRes, brandRes] = await Promise.all([
        supabase.from("products").select("id, name, price, original_price, image_url, category, description, sales, is_new, is_on_sale, discount, product_code, brand_id"),
        supabase.from("brands").select("id, name, logo_url"),
      ]);
      if (cancelled) return;
      if (prodRes.error) throw prodRes.error;
      const brandMap = new Map((brandRes.data || []).map((b: any) => [b.id, b]));
      const shuffled = shuffle((prodRes.data || []).map((row: any) => {
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
      if (!cancelled) {
        setAllProducts([]);
        setVisible([]);
        setHasMore(false);
        setError(true);
      }
    } finally {
      if (!cancelled) setLoading(false);
      clearTimeout(timeout);
    }

    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    const cleanup = fetchAll();
    return () => { cleanup.then?.((fn) => fn?.()); };
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
