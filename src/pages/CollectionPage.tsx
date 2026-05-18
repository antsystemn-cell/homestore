import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";
import ProductGrid from "@/components/store/ProductGrid";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import { Product, mapDbProduct } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { fetchCollectionByCode, incrementCollectionView, type ProductCollection } from "@/lib/collections";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, AlertCircle, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { setBundleFreeDelivery, BUNDLE_FREE_DELIVERY_THRESHOLD } from "@/lib/bundleDelivery";

const formatPrice = (n: number) => new Intl.NumberFormat("mn-MN").format(n) + "₮";

const BUNDLE_ENABLED_CODES = new Set(["tools"]);

const CollectionPage = () => {
  const { code } = useParams<{ code: string }>();
  const [collection, setCollection] = useState<ProductCollection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const col = await fetchCollectionByCode(code);
        if (cancelled) return;
        if (!col) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCollection(col);
        incrementCollectionView(code);

        const ids = Array.isArray(col.product_ids) ? col.product_ids : [];
        if (ids.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from("products")
          .select("id,slug,name,price,original_price,thumbnail_url,image_url,category,is_on_sale,discount,brand_id,is_new,is_bogo,sales,colors")
          .in("id", ids)
          .eq("is_active", true);
        if (cancelled) return;
        const mapped = (data || []).map(mapDbProduct);
        // preserve admin-defined order
        mapped.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        setProducts(mapped);
      } catch (e) {
        console.error(e);
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (collection) {
      document.title = `${collection.title} | EasyShop`;
    }
  }, [collection]);

  const totalPrice = products.reduce((s, p) => s + p.price, 0);
  const bundleEnabled = !!code && BUNDLE_ENABLED_CODES.has(code.toLowerCase());

  const addAllToCart = () => {
    if (products.length === 0 || !code) return;
    products.forEach((p) => addToCart(p, null, null, 1));
    if (bundleEnabled) {
      setBundleFreeDelivery(code.toLowerCase());
      if (totalPrice >= BUNDLE_FREE_DELIVERY_THRESHOLD) {
        toast.success(`${products.length} бараа сагсанд нэмэгдлээ — хүргэлт үнэгүй!`);
      } else {
        toast.success(`${products.length} бараа сагсанд нэмэгдлээ`);
      }
    } else {
      toast.success(`${products.length} бараа сагсанд нэмэгдлээ`);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <AlertCircle className="mx-auto mb-4 text-muted-foreground" size={64} />
          <h1 className="text-2xl font-bold mb-2">Багц олдсонгүй</h1>
          <p className="text-muted-foreground mb-6">Энэ линк хүчингүй болсон эсвэл устгагдсан байна.</p>
          <Button asChild><Link to="/">Нүүр хуудас</Link></Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-b from-muted/40 to-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Package size={16} />
            <span>Сонгосон багц</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
            {loading ? "Ачаалж байна..." : collection?.title}
          </h1>
          {collection?.description && (
            <p className="mt-3 text-muted-foreground max-w-2xl">{collection.description}</p>
          )}

          {!loading && products.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="text-sm text-muted-foreground">
                {products.length} бараа · Нийт {formatPrice(totalPrice)}
              </div>
              {bundleEnabled && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Button onClick={addAllToCart} size="lg" className="gap-2">
                    <ShoppingBag size={18} />
                    Багцаар нь авах ({formatPrice(totalPrice)})
                  </Button>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Truck size={16} className="text-primary" />
                    <span>
                      {totalPrice >= BUNDLE_FREE_DELIVERY_THRESHOLD
                        ? "Багцаар авбал хүргэлт ҮНЭГҮЙ"
                        : `50,000₮-өөс дээш багц авбал хүргэлт үнэгүй`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="max-w-6xl mx-auto px-2 md:px-4 py-6">
        {loading ? (
          <ProductGridSkeleton />
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Энэ багцад бараа байхгүй байна.
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CollectionPage;
