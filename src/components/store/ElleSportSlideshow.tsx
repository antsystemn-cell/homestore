import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Product, mapDbProduct, formatPrice } from "@/data/products";
import { fetchPublicBrands, fetchPublicProducts } from "@/lib/publicStoreApi";
import { transformImage } from "@/lib/imageUrl";

const AUTOPLAY_MS = 4500;

const ElleSportSlideshow = React.memo(() => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [brands, prods] = await Promise.all([
        fetchPublicBrands(),
        fetchPublicProducts(),
      ]);
      if (cancelled) return;
      const elle = (brands || []).find((b: any) =>
        String(b?.name || "").toLowerCase().includes("elle")
      );
      if (!elle) return;
      const mapped = (prods || [])
        .filter((r: any) => r.brand_id === elle.id)
        .map(mapDbProduct);
      setItems(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIndex((i) => (items.length === 0 ? 0 : i % items.length));
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      AUTOPLAY_MS
    );
    return () => window.clearInterval(id);
  }, [items.length]);

  const go = useCallback(
    (dir: "left" | "right") => {
      setIndex((i) => {
        const n = items.length;
        if (n === 0) return 0;
        return dir === "left" ? (i - 1 + n) % n : (i + 1) % n;
      });
    },
    [items.length]
  );

  const dots = useMemo(() => items.slice(0, Math.min(items.length, 8)), [items]);

  if (!items.length) return null;
  const current = items[index];
  const productUrl = `/product/${current.slug || current.id}`;
  const img = current.thumbnail || current.image || "/placeholder.svg";
  const discountPct =
    current.originalPrice && current.originalPrice > current.price
      ? Math.round(((current.originalPrice - current.price) / current.originalPrice) * 100)
      : current.discount || 0;

  return (
    <section className="py-4 md:py-6">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between gap-2 mb-3 md:mb-5">
          <a
            href="/ElleSport"
            onClick={(e) => {
              e.preventDefault();
              navigate("/ElleSport");
            }}
            className="flex items-center gap-2 md:gap-2.5 min-w-0 group/link"
          >
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight whitespace-nowrap group-hover/link:text-primary transition-colors">
              Elle Sport Woman
            </h2>
          </a>
          <a
            href="/ElleSport"
            onClick={(e) => {
              e.preventDefault();
              navigate("/ElleSport");
            }}
            className="text-xs md:text-sm font-medium text-primary hover:underline"
          >
            Бүгдийг харах
          </a>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
          <a
            href={productUrl}
            onClick={(e) => {
              if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                navigate(productUrl);
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 group no-underline text-inherit"
          >
            <div className="relative aspect-square md:aspect-[4/5] bg-secondary overflow-hidden">
              <img
                key={current.id}
                src={transformImage(img, 800)}
                alt={current.name}
                className="w-full h-full object-cover animate-fade-in group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
                decoding="async"
              />
              {discountPct > 0 && (
                <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-md shadow">
                  -{discountPct}%
                </span>
              )}
            </div>
            <div className="p-4 md:p-6 flex flex-col justify-center gap-3">
              <p className="text-[11px] md:text-xs uppercase tracking-wider text-primary font-semibold">
                Elle Sport · Woman
              </p>
              <h3
                key={`t-${current.id}`}
                className="text-base md:text-2xl font-bold text-foreground leading-snug animate-fade-in"
              >
                {current.name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-xl md:text-3xl font-extrabold text-foreground">
                  {formatPrice(current.price)}
                </span>
                {current.originalPrice != null && current.originalPrice > current.price && (
                  <span className="text-sm md:text-base text-muted-foreground line-through">
                    {formatPrice(current.originalPrice)}
                  </span>
                )}
              </div>
              <span className="mt-2 inline-flex items-center justify-center text-xs md:text-sm font-semibold bg-primary text-primary-foreground rounded-full px-4 py-2 w-fit">
                Дэлгэрэнгүй →
              </span>
            </div>
          </a>

          {items.length > 1 && (
            <>
              <button
                onClick={() => go("left")}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 md:h-10 md:w-10 rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background flex items-center justify-center text-foreground shadow"
                aria-label="Өмнөх"
              >
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <button
                onClick={() => go("right")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 md:h-10 md:w-10 rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background flex items-center justify-center text-foreground shadow"
                aria-label="Дараах"
              >
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              </button>

              <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
                {dots.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index % dots.length ? "w-6 bg-primary" : "w-1.5 bg-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
});

ElleSportSlideshow.displayName = "ElleSportSlideshow";

export default ElleSportSlideshow;
