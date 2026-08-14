import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/store/Header";
import CategoryNav from "@/components/store/CategoryNav";
import BottomNav from "@/components/store/BottomNav";
import ProductGrid from "@/components/store/ProductGrid";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import LoadError from "@/components/store/LoadError";
import { Product, mapDbProduct } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicCategories, fetchPublicBrands } from "@/lib/publicStoreApi";
import { ChevronRight, LayoutGrid } from "lucide-react";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    window.scrollTo(0, 0);
    
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        const [allCats, allBrands] = await Promise.all([
          fetchPublicCategories(),
          fetchPublicBrands()
        ]);
        
        if (cancelled) return;
        setBrands(allBrands);

        const currentCat = allCats.find((c: any) => c.slug === slug);
        if (!currentCat) {
          setError(true);
          setLoading(false);
          return;
        }
        setCategory(currentCat);

        // Find subcategories if this is a parent
        const subs = allCats.filter((c: any) => c.parent_id === currentCat.id);
        setSubcategories(subs);

        // Fetch products for this category or its subcategories
        const catIds = [currentCat.id, ...subs.map((s: any) => s.id)];
        const { data: prodRes, error: prodErr } = await supabase
          .from("products")
          .select("id,slug,name,price,original_price,image_url,thumbnail_url,category,is_on_sale,discount,brand_id,is_new,is_bogo,sales,colors")
          .in("category", allCats.filter(c => catIds.includes(c.id)).map(c => c.name))
          .eq("is_active", true)
          .order("sales", { ascending: false });

        if (prodErr) throw prodErr;
        if (cancelled) return;

        const brandMap = new Map(allBrands.map((b: any) => [b.id, b]));
        const mapped = (prodRes || []).map((row: any) => {
          const p = mapDbProduct(row);
          const b = brandMap.get(p.brand_id || "");
          if (b) { p.brandName = b.name; p.brandLogo = b.logo_url; }
          return p;
        });

        setProducts(mapped);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <CategoryNav />
        <LoadError onRetry={() => window.location.reload()} />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <CategoryNav />

      {/* Category Hero/Breadcrumb */}
      <div className="bg-secondary/30 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <button onClick={() => navigate("/")} className="hover:text-foreground">Нүүр</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{category?.name || "Ачаалж байна..."}</span>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{category?.name}</h1>
              <p className="text-sm text-muted-foreground mt-2">Нийт {products.length} бараа олдлоо</p>
            </div>
            
            {subcategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {subcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => navigate(`/category/${sub.slug}`)}
                    className="whitespace-nowrap px-4 py-2 rounded-full bg-background border border-border text-xs font-semibold hover:border-primary/40 transition-colors"
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto py-6 px-0 md:px-4">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <ProductGrid products={products} brands={brands} />
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Энэ ангилалд бараа байхгүй байна</p>
            <button 
              onClick={() => navigate("/")}
              className="text-primary font-bold hover:underline"
            >
              Буцах
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default CategoryPage;
