import { useState, useEffect } from "react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import { Product, mapDbProduct } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

const ShopPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      setProducts((data || []).map(mapDbProduct));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen bg-secondary pb-16 md:pb-0">
      <Header />
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Уншиж байна...</div>
      ) : (
        <ProductGrid title="Бүх бараа" products={products} />
      )}
      <BottomNav />
    </div>
  );
};

export default ShopPage;
