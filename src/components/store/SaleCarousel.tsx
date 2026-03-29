import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

interface Props {
  products: Product[];
}

const SaleCarousel = React.memo(({ products }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const scroll = useCallback((dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">
              Хязгаарлагдмал хугацаатай
            </p>
            <h2 className="font-display text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
              Хямдралтай
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full bg-surface-container hover:bg-accent transition-colors text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full bg-surface-container hover:bg-accent transition-colors text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile: editorial stacked cards */}
        <div className="md:hidden space-y-4">
          {/* First item - large hero */}
          {products[0] && (() => {
            const p = products[0];
            const discountPct =
              p.originalPrice && p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : p.discount || 0;
            return (
              <div
                onClick={() => navigate(`/product/${p.id}`)}
                className="cursor-pointer group animate-fade-in"
              >
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container">
                  <img
                    src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={() => handleImgError(p.id)}
                  />
                  {discountPct > 0 && (
                    <span className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full">
                      -{discountPct}%
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground leading-tight">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-extrabold text-base text-foreground">{formatPrice(p.price)}</p>
                    {p.originalPrice != null && p.originalPrice > p.price && (
                      <p className="text-xs text-muted-foreground line-through">{formatPrice(p.originalPrice)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Rest - 2-column grid */}
          {products.length > 1 && (
            <div className="grid grid-cols-2 gap-3">
              {products.slice(1, 5).map((p) => {
                const discountPct =
                  p.originalPrice && p.originalPrice > p.price
                    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                    : p.discount || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/product/${p.id}`)}
                    className="cursor-pointer group animate-fade-in"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container">
                      <img
                        src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                        onError={() => handleImgError(p.id)}
                      />
                      {discountPct > 0 && (
                        <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-medium text-foreground line-clamp-1">{p.name}</h3>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-display text-sm font-bold text-foreground">{formatPrice(p.price)}</span>
                        {p.originalPrice != null && p.originalPrice > p.price && (
                          <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.originalPrice)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop: horizontal carousel */}
        <div
          ref={scrollRef}
          className="hidden md:flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
        >
          {products.map((p) => {
            const discountPct =
              p.originalPrice && p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : p.discount || 0;

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="flex-shrink-0 w-[220px] snap-start cursor-pointer group animate-fade-in"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container">
                  <img
                    src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    onError={() => handleImgError(p.id)}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                  {discountPct > 0 && (
                    <span className="absolute top-2.5 left-2.5 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      -{discountPct}%
                    </span>
                  )}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="text-white font-bold text-sm drop-shadow-md">{formatPrice(p.price)}</p>
                    {p.originalPrice != null && p.originalPrice > p.price && (
                      <p className="text-white/70 text-xs line-through drop-shadow-sm">{formatPrice(p.originalPrice)}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 px-0.5">
                  <h3 className="text-sm text-foreground font-medium line-clamp-2 leading-snug">{p.name}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

SaleCarousel.displayName = "SaleCarousel";

export default SaleCarousel;
