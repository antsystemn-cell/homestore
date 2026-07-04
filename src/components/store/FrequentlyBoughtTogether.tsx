import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Check } from "lucide-react";
import { Product, mapDbProduct } from "@/data/products";
import { fetchFrequentlyBoughtTogether } from "@/lib/publicStoreApi";
import { useCart } from "@/context/CartContext";
import { transformImage } from "@/lib/imageUrl";
import { toast } from "@/hooks/use-toast";

interface Props {
  productId: string;
  className?: string;
  title?: string;
}

const FrequentlyBoughtTogether = ({ productId, className, title = "Үүнтэй хамт авдаг бараа" }: Props) => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFrequentlyBoughtTogether(productId, 3)
      .then((rows) => {
        if (cancelled) return;
        setItems((rows || []).map(mapDbProduct));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleAdd = (p: Product) => {
    addToCart(p, null, null, 1, null);
    setAddedIds((prev) => new Set(prev).add(p.id));
    toast({ title: "Сагсанд нэмэгдлээ", description: p.name });
  };

  if (loading || items.length === 0) return null;

  return (
    <section className={`mt-10 md:mt-14 px-4 md:px-0 ${className || ""}`}>
      <h2 className="text-base md:text-lg font-bold text-foreground mb-3 md:mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {items.map((p) => {
          const added = addedIds.has(p.id);
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => navigate(`/product/${p.slug || p.id}`)}
                className="shrink-0"
                aria-label={p.name}
              >
                <img
                  src={transformImage(p.thumbnail || p.image, 200) || "/placeholder.svg"}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover bg-secondary"
                />
              </button>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => navigate(`/product/${p.slug || p.id}`)}
                  className="text-xs md:text-sm font-semibold text-foreground line-clamp-2 text-left hover:text-primary transition-colors"
                >
                  {p.name}
                </button>
                <p className="text-xs md:text-sm font-bold text-foreground mt-1">
                  {p.price.toLocaleString("mn-MN")}₮
                </p>
              </div>
              <button
                onClick={() => handleAdd(p)}
                disabled={added}
                className={`shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center transition-colors ${
                  added
                    ? "bg-primary/10 text-primary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                aria-label="Сагсанд нэмэх"
              >
                {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FrequentlyBoughtTogether;
