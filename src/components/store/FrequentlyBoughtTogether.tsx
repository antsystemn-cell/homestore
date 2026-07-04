import { useEffect, useRef, useState } from "react";
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
  limit?: number;
  variant?: "grid" | "vertical" | "carousel";
  pageSize?: number;
}


const FrequentlyBoughtTogether = ({
  productId,
  className,
  title = "Үүнтэй хамт авдаг бараа",
  limit = 3,
  variant = "grid",
  pageSize = 4,
}: Props) => {
  const [items, setItems] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFrequentlyBoughtTogether(productId, limit)
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
  }, [productId, limit]);

  const handleAdd = (p: Product) => {
    addToCart(p, null, null, 1, null);
    setAddedIds((prev) => new Set(prev).add(p.id));
    toast({ title: "Сагсанд нэмэгдлээ", description: p.name });
  };

  if (loading || items.length === 0) return null;

  if (variant === "carousel") {
    const pages: Product[][] = [];
    for (let i = 0; i < items.length; i += pageSize) {
      pages.push(items.slice(i, i + pageSize));
    }
    return (
      <CarouselView
        pages={pages}
        title={title}
        className={className}
        addedIds={addedIds}
        onAdd={handleAdd}
        onNavigate={(p) => navigate(`/product/${p.slug || p.id}`)}
      />
    );
  }

  const containerClass =
    variant === "vertical"
      ? "flex flex-col gap-2 md:gap-3"
      : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4";

  return (
    <section className={`mt-6 md:mt-8 px-4 md:px-0 ${className || ""}`}>
      <h2 className="text-base md:text-lg font-bold text-foreground mb-3 md:mb-4">{title}</h2>
      <div className={containerClass}>
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

interface CarouselViewProps {
  pages: Product[][];
  title: string;
  className?: string;
  addedIds: Set<string>;
  onAdd: (p: Product) => void;
  onNavigate: (p: Product) => void;
}

const CarouselView = ({ pages, title, className, addedIds, onAdd, onNavigate }: CarouselViewProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activePage, setActivePage] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activePage) setActivePage(idx);
  };

  return (
    <section className={`mt-4 px-4 ${className || ""}`}>
      <h2 className="text-base font-bold text-foreground mb-3">{title}</h2>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {pages.map((page, pi) => (
          <div
            key={pi}
            className="shrink-0 w-full snap-start grid grid-cols-3 gap-1.5"
          >
            {page.map((p) => {
              const added = addedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className="relative rounded-lg border border-border bg-card overflow-hidden flex flex-col"
                >
                  <button
                    onClick={() => onNavigate(p)}
                    className="block aspect-square bg-secondary"
                    aria-label={p.name}
                  >
                    <img
                      src={transformImage(p.thumbnail || p.image, 200) || "/placeholder.svg"}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="p-1.5 flex-1 flex flex-col gap-0.5">
                    <button
                      onClick={() => onNavigate(p)}
                      className="text-[10px] leading-tight font-medium text-foreground line-clamp-2 text-left"
                    >
                      {p.name}
                    </button>
                    <div className="mt-auto flex items-center justify-between gap-1 pt-0.5">
                      <p className="text-[10px] font-bold text-foreground truncate">
                        {p.price.toLocaleString("mn-MN")}₮
                      </p>
                      <button
                        onClick={() => onAdd(p)}
                        disabled={added}
                        className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center transition-colors ${
                          added
                            ? "bg-primary/10 text-primary"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                        aria-label="Сагсанд нэмэх"
                      >
                        {added ? <Check className="h-3 w-3" /> : <ShoppingCart className="h-3 w-3" />}
                      </button>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = scrollRef.current;
                if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
              }}
              aria-label={`Хуудас ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activePage ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};


export default FrequentlyBoughtTogether;
