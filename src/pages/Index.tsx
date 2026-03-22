import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
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
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data, error } = await supabase.from("products").select("*");
        if (error) throw error;
        const shuffled = shuffle((data || []).map(mapDbProduct));
        setAllProducts(shuffled);
        setVisible(shuffled.slice(0, PAGE_SIZE));
        setHasMore(shuffled.length > PAGE_SIZE);
      } catch (error) {
        console.error("Failed to load products", error);
        setAllProducts([]);
        setVisible([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

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
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Уншиж байна...</div>
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
