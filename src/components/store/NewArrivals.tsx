import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  products: Product[];
}

const NewArrivals = React.memo(({ products }: Props) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  }, []);

  const scroll = useCallback((dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="py-5 md:py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight">
              Шинэ бараа
            </h2>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              className="p-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
        >
          {products.map((p, index) => {
            const productUrl = `/product/${p.slug || p.id}`;
            const discountPct =
              p.originalPrice && p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : p.discount || 0;

            return (
              <a
                key={p.id}
                href={productUrl}
                onClick={(e) => {
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    navigate(productUrl);
                  }
                }}
                className="flex-shrink-0 w-[46vw] md:w-[calc(25%-12px)] snap-start group block no-underline text-inherit animate-fade-in"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border/60 hover:border-primary/40 shadow-sm hover:shadow-lg transition-all duration-300">
                  {/* Image */}
                  <div className="relative aspect-square bg-secondary overflow-hidden flex items-center justify-center">
                    <img
                      src={imgErrors[p.id] ? "/placeholder.svg" : (p.thumbnail || p.image)}
                      alt={p.name}
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      width={300}
                      height={300}
                      onError={() => handleImgError(p.id)}
                    />

                    {/* "New" badge */}
                    <div className="absolute top-2 left-2">
                      <span className="bg-primary text-primary-foreground text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
                        Шинэ
                      </span>
                    </div>

                    {/* Discount badge */}
                    {discountPct > 0 && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-md">
                          -{discountPct}%
                        </span>
                      </div>
                    )}

                    {/* Bottom gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="px-2.5 py-2.5 md:px-3 md:py-3 space-y-1">
                    <h3 className="text-xs md:text-sm text-foreground font-medium line-clamp-2 leading-snug min-h-[2.4em]">
                      {p.name}
                    </h3>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm md:text-base font-bold text-foreground">
                        {formatPrice(p.price)}
                      </span>
                      {p.originalPrice != null && p.originalPrice > p.price && (
                        <span className="text-[10px] md:text-xs text-muted-foreground line-through">
                          {formatPrice(p.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
});

NewArrivals.displayName = "NewArrivals";

export default NewArrivals;
