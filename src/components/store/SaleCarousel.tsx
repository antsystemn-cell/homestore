import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { ChevronLeft, ChevronRight, Flame, ArrowRight } from "lucide-react";

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

  const limited = products.slice(0, 8);

  if (limited.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <a
            href="/sales"
            onClick={(e) => { e.preventDefault(); navigate("/sales"); }}
            className="flex items-center gap-2.5 group/link"
          >
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Flame className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
            </div>
            <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight group-hover/link:text-destructive transition-colors">
              Хямдралтай
            </h2>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover/link:text-destructive group-hover/link:translate-x-0.5 transition-all" />
          </a>

          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              className="p-1.5 rounded-full border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-colors text-muted-foreground hover:text-destructive"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-1.5 rounded-full border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-colors text-muted-foreground hover:text-destructive"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
        >
          {limited.map((p, index) => {
            const discountPct =
              p.originalPrice && p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : p.discount || 0;

            const productUrl = `/product/${p.slug || p.id}`;

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
                className="flex-shrink-0 w-[36vw] md:w-[180px] snap-start group animate-fade-in block no-underline text-inherit"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative rounded-xl overflow-hidden bg-card border border-border/60 hover:border-destructive/30 shadow-sm hover:shadow-md transition-all duration-300">
                  {/* Image */}
                  <div className="relative aspect-square bg-secondary overflow-hidden">
                    <img
                      src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      width={180}
                      height={180}
                      onError={() => handleImgError(p.id)}
                    />

                    {/* Discount badge */}
                    {discountPct > 0 && (
                      <div className="absolute top-1.5 left-1.5">
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          -{discountPct}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-2 py-2 space-y-0.5">
                    <h3 className="text-[11px] md:text-xs text-foreground font-medium line-clamp-2 leading-snug min-h-[2.2em]">
                      {p.name}
                    </h3>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs md:text-sm font-bold text-destructive">
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

SaleCarousel.displayName = "SaleCarousel";

export default SaleCarousel;
