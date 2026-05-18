import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  // Default: nothing selected in bundle mode
  useEffect(() => {
    if (bundleEnabled) {
      setSelectedIds(new Set());
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
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Truck size={16} className="text-primary" />
                  <span>
                    {selectedTotal >= BUNDLE_FREE_DELIVERY_THRESHOLD
                      ? "Сонгосон багц 50,000₮-өөс дээш — хүргэлт ҮНЭГҮЙ"
                      : `50,000₮-өөс дээш багц авбал хүргэлт үнэгүй`}
                  </span>
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
        ) : bundleEnabled ? (
          <div className="md:px-4">
            <div className="flex items-center justify-between mb-3 px-2 md:px-0">
              <button
                onClick={toggleSelectAll}
                className="text-sm font-medium text-primary hover:underline"
              >
                {selectedIds.size === products.length ? "Бүгдийг арилгах" : "Бүгдийг сонгох"}
              </button>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size}/{products.length} сонгосон
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`relative rounded-xl border overflow-hidden bg-card transition ${
                      checked ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelect(p.id)}
                      className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-background/90 backdrop-blur rounded-md px-2 py-1.5 shadow-sm"
                      aria-label="Сонгох"
                    >
                      <Checkbox
                        checked={checked}
                        className="h-5 w-5 pointer-events-none"
                      />
                      <span className="text-xs font-semibold text-foreground">
                        {checked ? "Сонгосон" : "Сонгох"}
                      </span>
                    </button>
                    <Link
                      to={`/product/${p.slug || p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block"
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={p.thumbnail || p.image || "/placeholder.svg"}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 md:p-3">
                        <p className="text-xs md:text-sm font-medium line-clamp-2 min-h-[2.5em]">{p.name}</p>
                        <p className="mt-1 text-sm md:text-base font-bold">{formatPrice(p.price)}</p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>

      {/* Sticky bundle bar */}
      {bundleEnabled && !loading && products.length > 0 && (
        <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-30 px-3">
          <div className="max-w-6xl mx-auto bg-card border border-border shadow-lg rounded-2xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {selectedProducts.length} сонгосон
              </p>
              <p className="text-base md:text-lg font-bold">{formatPrice(selectedTotal)}</p>
            </div>
            <Button
              onClick={addSelectedToCart}
              size="lg"
              disabled={selectedProducts.length === 0}
              className="gap-2 shrink-0"
            >
              <ShoppingBag size={18} />
              Багцаар нь авах
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default CollectionPage;
