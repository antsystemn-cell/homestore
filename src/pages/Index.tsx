import { useState, useEffect } from "react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import { Product, mapDbProduct } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
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
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Уншиж байна...</div>
      ) : (
        <ProductGrid products={products} />
      )}
      <BottomNav />
    </div>
  );
};

export default Index;
