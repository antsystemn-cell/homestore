import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap, Clock, Gift } from "lucide-react";
import { formatPrice } from "@/data/products";
import { useFlashSales, FlashSaleRow } from "@/hooks/useFlashSales";
import { fetchPublicBrands } from "@/lib/publicStoreApi";
import { supabase } from "@/integrations/supabase/client";
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

  const Box = ({ v, pulse = false }: { v: number; pulse?: boolean }) => (
    <span
      key={pulse ? v : undefined}
      className={`min-w-[22px] md:min-w-[26px] px-1 md:px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground text-[11px] md:text-sm font-bold tabular-nums text-center ${
        pulse ? "animate-scale-in" : ""
      }`}
    >
      {pad(v)}
    </span>
  );
  const Sep = () => <span className="text-destructive font-bold text-xs md:text-sm">:</span>;

  return (
    <div className="flex items-center gap-1 md:gap-1.5" aria-label="Flash sale үлдсэн хугацаа" aria-live="polite">
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
      <Box v={t.s} pulse />
    </div>
  );
};

const AUTOPLAY_MS = 4000;

const FlashSaleSection = React.memo(() => {
  const allRows = useFlashSales();
  const navigate = useNavigate();
  const [productBrandMap, setProductBrandMap] = useState<Record<string, string | null>>({});
  const [elleBrandId, setElleBrandId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  // Resolve Elle Sport brand id
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const brands = await fetchPublicBrands();
      if (cancelled) return;
      const elle = (brands || []).find((b: any) =>
        String(b?.name || "").toLowerCase().includes("elle")
      );
      setElleBrandId(elle?.id || null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch brand_id for the flash-sale product ids we don't yet know about
  useEffect(() => {
    const missing = allRows
      .map((r) => r.product_id)
      .filter((id) => !(id in productBrandMap));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,brand_id")
        .in("id", missing);
      if (cancelled || error || !data) return;
      setProductBrandMap((prev) => {
        const next = { ...prev };
        data.forEach((p: any) => {
          next[p.id] = p.brand_id ?? null;
        });
        missing.forEach((id) => {
          if (!(id in next)) next[id] = null;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [allRows, productBrandMap]);

  // Elle Sport + 50% off only
  const flashRows = useMemo<FlashSaleRow[]>(() => {
    if (!elleBrandId) return [];
    return allRows.filter(
      (r) =>
        productBrandMap[r.product_id] === elleBrandId &&
        Number(r.discount_percent) === 50
    );
  }, [allRows, productBrandMap, elleBrandId]);

  // BOGO (1+1) products — shown inside the flash sale carousel
  const [bogoRows, setBogoRows] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,slug,name,price,original_price,image_url,thumbnail_url")
        .eq("is_bogo", true)
        .eq("is_active", true)
        .limit(12);
      if (cancelled || error || !data) return;
      setBogoRows(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  type Slide = {
    key: string;
    kind: "flash" | "bogo";
    name: string;
    url: string;
    image: string;
    price: number;
    original: number | null;
    endsAt?: string;
    discount?: number;
  };

  const slides = useMemo<Slide[]>(() => {
    const f: Slide[] = flashRows.map((r) => ({
      key: `f-${r.id}`,
      kind: "flash",
      name: r.product_name,
      url: `/product/${r.product_slug || r.product_id}`,
      image: r.product_thumbnail || r.product_image || "/placeholder.svg",
      price: Number(r.sale_price),
      original: Number(r.product_price) || null,
      endsAt: r.ends_at,
      discount: Number(r.discount_percent),
    }));
    const b: Slide[] = bogoRows.map((p) => ({
      key: `b-${p.id}`,
      kind: "bogo",
      name: p.name,
      url: `/product/${p.slug || p.id}`,
      image: p.thumbnail_url || p.image_url || "/placeholder.svg",
      price: Number(p.price),
      original: p.original_price ? Number(p.original_price) : null,
    }));
    return [...b, ...f];
  }, [flashRows, bogoRows]);

  // Reset index when list changes
  useEffect(() => {
    setIndex((i) => (slides.length === 0 ? 0 : i % slides.length));
  }, [slides.length]);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      AUTOPLAY_MS
    );
    return () => window.clearInterval(id);
  }, [slides.length]);

  const go = useCallback(
    (dir: "left" | "right") => {
      setIndex((i) => {
        const n = slides.length;
        if (n === 0) return 0;
        return dir === "left" ? (i - 1 + n) % n : (i + 1) % n;
      });
    },
    [slides.length]
  );

  if (!slides.length) return null;

  const current = slides[Math.min(index, slides.length - 1)];
  const isBogo = current.kind === "bogo";
  const productUrl = current.url;
  const soonestEndsAt = flashRows
    .map((r) => r.ends_at)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  const accent = isBogo ? "primary" : "destructive";

  return (
    <section className="py-2 md:py-6 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between gap-2 mb-3 md:mb-5">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-destructive fill-destructive" />
            </div>
            <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight whitespace-nowrap">
              {bogoRows.length ? "Flash Sale · 1+1 урамшуулал" : "Elle Sport Woman · 50%"}
            </h2>
            {soonestEndsAt && (
              <>
                <span className="hidden sm:inline text-xs text-muted-foreground">Дуусахад:</span>
                <HeaderCountdown endsAt={soonestEndsAt} />
              </>
            )}
          </div>
        </div>

        <div
          className={`relative rounded-2xl overflow-hidden bg-card border shadow-sm ${
            isBogo ? "border-primary/40" : "border-destructive/30"
          }`}
        >
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
                key={current.key}
                src={transformImage(current.image, 800)}
                alt={current.name}
                className="w-full h-full object-cover animate-fade-in group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
                decoding="async"
              />
              {isBogo ? (
                <>
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs md:text-sm font-extrabold uppercase px-3 py-1.5 rounded-full shadow-lg ring-2 ring-primary/30 animate-pulse">
                    <Gift className="h-3.5 w-3.5" />
                    1+1 ҮНЭГҮЙ
                  </span>
                  <span className="absolute bottom-0 left-0 right-0 bg-primary/95 py-1.5 text-center text-xs md:text-sm font-bold text-primary-foreground">
                    1 авбал 1 ҮНЭГҮЙ
                  </span>
                </>
              ) : (
                <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-md shadow">
                  -{current.discount ?? 50}%
                </span>
              )}
            </div>
            <div className="p-4 md:p-6 flex flex-col justify-center gap-3">
              <p
                className={`text-[11px] md:text-xs uppercase tracking-wider font-semibold ${
                  isBogo ? "text-primary" : "text-destructive"
                }`}
              >
                {isBogo ? "1+1 урамшуулал" : "Flash Sale"}
              </p>
              <h3
                key={`t-${current.key}`}
                className="text-base md:text-2xl font-bold text-foreground leading-snug animate-fade-in"
              >
                {current.name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xl md:text-3xl font-extrabold ${
                    isBogo ? "text-primary" : "text-destructive"
                  }`}
                >
                  {formatPrice(current.price)}
                </span>
                {current.original != null && current.original > current.price && (
                  <span className="text-sm md:text-base text-muted-foreground line-through">
                    {formatPrice(current.original)}
                  </span>
                )}
              </div>
              {isBogo && (
                <p className="text-xs md:text-sm text-muted-foreground">
                  2 ширхэг сагсанд нэмэхэд төлбөр нь 1 ширхэгийн үнэтэй тэнцэнэ.
                </p>
              )}
              <span
                className={`mt-2 inline-flex items-center justify-center text-xs md:text-sm font-semibold rounded-full px-4 py-2 w-fit ${
                  isBogo
                    ? "bg-primary text-primary-foreground"
                    : "bg-destructive text-destructive-foreground"
                }`}
              >
                Худалдан авах →
              </span>
            </div>
          </a>

          {slides.length > 1 && (
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
                {slides.map((s, i) => (
                  <button
                    key={s.key}
                    onClick={() => setIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index
                        ? s.kind === "bogo"
                          ? "w-6 bg-primary"
                          : "w-6 bg-destructive"
                        : "w-1.5 bg-foreground/30"
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


FlashSaleSection.displayName = "FlashSaleSection";

export default FlashSaleSection;
