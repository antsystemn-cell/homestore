import { useState, useEffect } from "react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import { Product, mapDbProduct } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

const ShopPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, brandRes] = await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("brands").select("id, name").order("name"),
        ]);
        if (prodRes.error) throw prodRes.error;
        setProducts((prodRes.data || []).map(mapDbProduct));
        setBrands(brandRes.data || []);
      } catch (error) {
        console.error("Failed to load shop products", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = selectedBrand === "all"
    ? products
    : products.filter((p) => (p as any).brand_id === selectedBrand);

  return (
    <div className="min-h-screen bg-secondary pb-16 md:pb-0">
      <Header />
      {brands.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedBrand("all")}
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
                onClick={() => setSelectedBrand(b.id)}
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
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Уншиж байна...</div>
      ) : (
        <ProductGrid title="Бүх бараа" products={filtered} />
      )}
      <BottomNav />
    </div>
  );
};

export default ShopPage;
