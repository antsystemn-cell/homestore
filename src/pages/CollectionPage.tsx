import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";
import ProductGrid from "@/components/store/ProductGrid";
import ProductGridSkeleton from "@/components/store/ProductGridSkeleton";
import { Product, mapDbProduct } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { fetchCollectionByCode, incrementCollectionView, type ProductCollection } from "@/lib/collections";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingBag, Package, AlertCircle, Truck, Check } from "lucide-react";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const bundleEnabled = !!code && BUNDLE_ENABLED_CODES.has(code.toLowerCase());

  // Pre-select all products on load (bundle mode)
  useEffect(() => {
    if (bundleEnabled && products.length > 0) {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }, [bundleEnabled, products]);

  const totalPrice = products.reduce((s, p) => s + p.price, 0);
  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  );
  const selectedTotal = selectedProducts.reduce((s, p) => s + p.price, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const addSelectedToCart = () => {
    if (selectedProducts.length === 0 || !code) {
      toast.error("Дор хаяж нэг бараа сонгоно уу");
      return;
    }
    selectedProducts.forEach((p) => addToCart(p, null, null, 1));
    setBundleFreeDelivery(code.toLowerCase());
    if (selectedTotal >= BUNDLE_FREE_DELIVERY_THRESHOLD) {
      toast.success(`${selectedProducts.length} бараа сагсанд нэмэгдлээ — хүргэлт үнэгүй!`);
    } else {
      toast.success(`${selectedProducts.length} бараа сагсанд нэмэгдлээ`);
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
