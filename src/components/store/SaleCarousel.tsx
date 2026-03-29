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

  const limited = products.slice(0, 4);

  if (limited.length === 0) return null;

  return (
    <section className="py-5 md:py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Flame className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-foreground">Хямдралтай бараа</h2>
              <p className="text-[11px] text-muted-foreground">Хязгаарлагдмал хугацаатай</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full bg-secondary hover:bg-accent transition-colors text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full bg-secondary hover:bg-accent transition-colors text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
        >
          {limited.map((p) => {
            const discountPct =
              p.originalPrice && p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : p.discount || 0;

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="flex-shrink-0 w-[44vw] md:w-[220px] snap-start cursor-pointer group animate-fade-in"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                  <img
                    src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    width={220}
                    height={220}
                    onError={() => handleImgError(p.id)}
                  />
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Discount badge */}
                  {discountPct > 0 && (
                    <span className="absolute top-2.5 left-2.5 bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">
                      -{discountPct}%
                    </span>
                  )}
                  {/* Price on image */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="text-white font-bold text-sm md:text-base drop-shadow-md">
                      {formatPrice(p.price)}
                    </p>
                    {p.originalPrice != null && p.originalPrice > p.price && (
                      <p className="text-white/70 text-[10px] md:text-xs line-through drop-shadow-sm">
                        {formatPrice(p.originalPrice)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 px-0.5">
                  <h3 className="text-xs md:text-sm text-foreground font-medium line-clamp-2 leading-snug min-h-[2.5em]">
                    {p.name}
                  </h3>
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