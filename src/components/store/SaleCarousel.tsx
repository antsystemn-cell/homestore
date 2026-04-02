import React, { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";

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

  const limited = products.slice(0, 6);

  if (limited.length === 0) return null;

  return (
    <section className="py-4 md:py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header with gradient accent */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <a href="/sales" onClick={(e) => { e.preventDefault(); navigate("/sales"); }} className="flex items-center gap-3 group/link">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-destructive to-[hsl(30,100%,50%)] flex items-center justify-center shadow-md">
                <Zap className="h-5 w-5 text-white fill-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-[hsl(var(--warning))] rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-foreground tracking-tight group-hover/link:text-primary transition-colors">
                Flash Sale
              </h2>
              <CountdownTimer />
            </div>
          </a>
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
          className="flex gap-2.5 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
        >
          {limited.map((p, index) => {
            const discountPct =
              p.originalPrice && p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : p.discount || 0;

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/product/${p.slug || p.id}`)}
                className="flex-shrink-0 w-[38vw] md:w-[200px] snap-start cursor-pointer group animate-fade-in"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Card with subtle border glow */}
                <div className="relative rounded-xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  {/* Image */}
                  <div className="relative aspect-[4/5] bg-secondary overflow-hidden">
                    <img
                      src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      width={200}
                      height={250}
                      onError={() => handleImgError(p.id)}
                    />

                    {/* Top gradient */}
                    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/30 to-transparent" />
                    {/* Bottom gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Discount badge - top left */}
                    {discountPct > 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-destructive text-destructive-foreground text-[10px] md:text-xs font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                          -{discountPct}%
                        </span>
                      </div>
                    )}

                    {/* Price overlay - bottom */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white font-extrabold text-sm md:text-base drop-shadow-lg">
                        {formatPrice(p.price)}
                      </p>
                      {p.originalPrice != null && p.originalPrice > p.price && (
                        <p className="text-white/60 text-[10px] md:text-xs line-through drop-shadow-sm">
                          {formatPrice(p.originalPrice)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product name */}
                  <div className="px-2.5 py-2">
                    <h3 className="text-[11px] md:text-xs text-foreground font-medium line-clamp-2 leading-snug min-h-[2.2em]">
                      {p.name}
                    </h3>
                  </div>
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
