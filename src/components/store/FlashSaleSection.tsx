import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap, Clock } from "lucide-react";
import { formatPrice } from "@/data/products";
import { useFlashSales } from "@/hooks/useFlashSales";
import FlashSaleCountdown from "./FlashSaleCountdown";
import { transformImage } from "@/lib/imageUrl";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

const HeaderCountdown = ({ endsAt }: { endsAt: string }) => {
  const compute = () => {
    const total = Math.max(0, new Date(endsAt).getTime() - Date.now());
    const s = Math.floor(total / 1000);
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60,
      total,
    };
  };
  const [t, setT] = useState(compute);
  useEffect(() => {
    setT(compute());
    const id = window.setInterval(() => setT(compute()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  if (t.total <= 0) return null;

  const Box = ({ v }: { v: number }) => (
    <span className="min-w-[22px] md:min-w-[26px] px-1 md:px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground text-[11px] md:text-sm font-bold tabular-nums text-center">
      {pad(v)}
    </span>
  );
  const Sep = () => <span className="text-destructive font-bold text-xs md:text-sm">:</span>;

  return (
    <div className="flex items-center gap-1 md:gap-1.5" aria-label="Flash sale үлдсэн хугацаа">
      <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-destructive flex-shrink-0" />
      {t.d > 0 && (
        <>
          <Box v={t.d} />
          <Sep />
        </>
      )}
      <Box v={t.h} />
      <Sep />
      <Box v={t.m} />
      <Sep />
      <Box v={t.s} />
    </div>
  );
};


const FlashSaleSection = React.memo(() => {
  const rows = useFlashSales();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scroll = useCallback((dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  if (!rows.length) return null;

  // Soonest-ending active flash sale drives the header countdown
  const soonestEndsAt = rows
    .map((r) => r.ends_at)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  return (
    <section className="py-4 md:py-6">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between gap-2 mb-3 md:mb-5">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-destructive fill-destructive" />
            </div>
            <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight whitespace-nowrap">
              Flash Sales
            </h2>
            {soonestEndsAt && (
              <>
                <span className="hidden sm:inline text-xs text-muted-foreground">Дуусахад:</span>
                <HeaderCountdown endsAt={soonestEndsAt} />
              </>
            )}
          </div>
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => scroll("left")}
              className="p-1.5 rounded-full border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-colors text-muted-foreground hover:text-destructive"
              aria-label="Өмнөх"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-1.5 rounded-full border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-colors text-muted-foreground hover:text-destructive"
              aria-label="Дараах"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>


        <div
          ref={scrollRef}
          className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
        >
          {rows.map((r, index) => {
            const productUrl = `/product/${r.product_slug || r.product_id}`;
            const img = r.product_thumbnail || r.product_image || "/placeholder.svg";
            return (
              <a
                key={r.id}
                href={productUrl}
                onClick={(e) => {
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    navigate(productUrl);
                  }
                }}
                className="flex-shrink-0 w-[42vw] md:w-[200px] snap-start group animate-fade-in block no-underline text-inherit"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative rounded-xl overflow-hidden bg-card border border-destructive/30 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="relative aspect-square bg-secondary overflow-hidden">
                    <img
                      src={transformImage(img, 400)}
                      alt={r.product_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      width={200}
                      height={200}
                    />
                    {r.discount_percent > 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        -{r.discount_percent}%
                      </span>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <FlashSaleCountdown endsAt={r.ends_at} compact />
                    </div>
                  </div>
                  <div className="px-2 py-2 space-y-0.5">
                    <h3 className="text-[11px] md:text-xs text-foreground font-medium line-clamp-2 leading-snug min-h-[2.2em]">
                      {r.product_name}
                    </h3>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs md:text-sm font-bold text-destructive">
                        {formatPrice(r.sale_price)}
                      </span>
                      {Number(r.product_price) > Number(r.sale_price) && (
                        <span className="text-[10px] md:text-xs text-muted-foreground line-through">
                          {formatPrice(r.product_price)}
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

FlashSaleSection.displayName = "FlashSaleSection";

export default FlashSaleSection;
