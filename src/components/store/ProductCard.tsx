import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Star, Zap } from "lucide-react";
import { Product, formatPrice } from "@/data/products";
import { getColorHex } from "@/lib/colorMap";
import { transformImage, buildSrcSet } from "@/lib/imageUrl";
import { useProductStat } from "@/hooks/useProductStat";
import { useFlashSaleFor } from "@/hooks/useFlashSales";
import FlashSaleCountdown from "./FlashSaleCountdown";



interface Props {
  product: Product;
  /** Set true for the first ~4 cards above the fold to preload eagerly with high priority. */
  priority?: boolean;
}

const RatingRow = ({ productId }: { productId: string }) => {
  const stat = useProductStat(productId);
  if (!stat || stat.count === 0) return null;
  return (
    <div className="mt-1 flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span className="font-semibold text-foreground">{stat.avg.toFixed(1)}</span>
      <span>({stat.count})</span>
    </div>
  );
};

const ProductCard = React.memo(({ product, priority = false }: Props) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const flashSale = useFlashSaleFor(product.id);
  
  // Directly use the price values from the product object first
  // to ensure immediate visibility while hooks/states resolve.
  const basePrice = product.price;
  const baseOriginal = product.originalPrice;
  
  // Override with flash sale data if available
  const displayPrice = flashSale ? Number(flashSale.sale_price) : basePrice;
  const displayOriginal = flashSale ? basePrice : baseOriginal;
  
  const hasValidPrice = typeof displayPrice === 'number' && displayPrice > 0;


  const [isHovering, setIsHovering] = useState(false);
  const [pinnedColorIdx, setPinnedColorIdx] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const handleImgError = useCallback(() => setImgError(true), []);

  const productUrl = `/product/${product.slug || product.id}`;

  // Track touch/drag to prevent navigation when user is swiping the image carousel
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipedRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - start.x) > 8 || Math.abs(t.clientY - start.y) > 8) {
      swipedRef.current = true;
    }
  }, []);

  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (swipedRef.current) {
      e.preventDefault();
      swipedRef.current = false;
      return;
    }
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      navigate(productUrl);
    }
  }, [navigate, productUrl]);

  const colors = product.colors;
  const baseImage = product.thumbnail || product.image || "/placeholder.svg";

  // Build slides: base image + every distinct color image.
  // colorSlideMap: colorIdx -> slideIdx. Colors without their own image fall back to slide 0.
  const { slides, colorSlideMap } = useMemo(() => {
    const list: string[] = [baseImage];
    const map = new Map<number, number>();
    // Allow color variants images as slides on all pages
    if (colors && colors.length) {
      colors.forEach((c, ci) => {
        if (c.image && c.image.trim()) {
          const existing = list.indexOf(c.image);
          if (existing >= 0) {
            map.set(ci, existing);
          } else {
            list.push(c.image);
            map.set(ci, list.length - 1);
          }
        } else {
          map.set(ci, 0);
        }
      });
    }
    return { slides: list, colorSlideMap: map };
  }, [baseImage, colors]);

  const hasMultipleSlides = slides.length > 1;
  const hasSwatches = !!(colors && colors.length > 1);

  // Smoothly scroll mobile snap container to a slide
  const scrollToIndex = useCallback((idx: number, smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Desktop hover auto-cycle (only if multiple slides and not pinned)
  useEffect(() => {
    if (!hasMultipleSlides) return;
    if (!isHovering) return;
    if (pinnedColorIdx !== null) return;

    hoverTimerRef.current = window.setInterval(() => {
      setActiveIdx((i) => {
        const next = (i + 1) % slides.length;
        scrollToIndex(next);
        return next;
      });
    }, 1100);

    return () => {
      if (hoverTimerRef.current) {
        window.clearInterval(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, [hasMultipleSlides, isHovering, pinnedColorIdx, slides.length, scrollToIndex]);

  // Reset to first slide when hover ends and no color pinned
  useEffect(() => {
    if (isHovering || pinnedColorIdx !== null) return;
    if (!hasMultipleSlides) return;
    setActiveIdx(0);
    scrollToIndex(0);
  }, [isHovering, pinnedColorIdx, hasMultipleSlides, scrollToIndex]);

  // When user pins a color, jump to its slide
  useEffect(() => {
    if (pinnedColorIdx === null) return;
    const target = colorSlideMap.get(pinnedColorIdx);
    if (target === undefined) return;
    setActiveIdx(target);
    scrollToIndex(target);
  }, [pinnedColorIdx, colorSlideMap, scrollToIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    if (i !== activeIdx && i >= 0 && i < slides.length) {
      setActiveIdx(i);
    }
  }, [activeIdx, slides.length]);

  const fallbackSrc = imgError ? "/placeholder.svg" : baseImage;

  return (
    <a
      href={productUrl}
      className="bg-card overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-lg rounded-none md:rounded-xl animate-fade-in block no-underline text-inherit"
      onClick={handleLinkClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative aspect-square bg-secondary overflow-hidden p-6 md:p-0">
        {hasMultipleSlides ? (
          <>
            <div
              ref={scrollerRef}
              className="w-full h-full flex overflow-x-auto md:overflow-hidden snap-x snap-mandatory no-scrollbar scroll-smooth touch-pan-x"
              onScroll={handleScroll}
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {slides.map((src, i) => (
                <div
                  key={i}
                  className="w-full h-full flex-shrink-0 snap-start"
                  style={{ minWidth: "100%" }}
                >
                  <img
                    src={imgError ? "/placeholder.svg" : transformImage(src, 400)}
                    srcSet={imgError ? undefined : buildSrcSet(src, [200, 400, 800])}
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    alt={`${product.name}${i > 0 ? ` - ${i + 1}` : ""}`}
                    className="w-full h-full object-contain md:object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                    loading={priority && i === 0 ? "eager" : "lazy"}
                    fetchPriority={priority && i === 0 ? "high" : "auto"}
                    decoding="async"
                    width={400}
                    height={400}
                    draggable={false}
                    onError={handleImgError}
                  />
                </div>
              ))}
            </div>
            {/* Slide indicator dots */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none z-10">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === activeIdx ? "w-4 bg-white" : "w-1 bg-white/60"
                  }`}
                  style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                />
              ))}
            </div>
          </>
        ) : (
          <img
            src={imgError ? "/placeholder.svg" : transformImage(fallbackSrc, 400)}
            srcSet={imgError ? undefined : buildSrcSet(fallbackSrc, [200, 400, 800])}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            alt={product.name}
            className="w-full h-full object-contain md:object-cover group-hover:scale-105 transition-transform duration-300"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={400}
            height={400}
            onError={handleImgError}
          />
        )}

        {product.isBogo && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded z-10">
            1+1
          </span>
        )}
        {product.hasGift && !product.isBogo && (
          <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded z-10 flex items-center gap-1">
            🎁 Бэлэгтэй
          </span>
        )}
        {flashSale ? (
          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded z-10 flex items-center gap-1">
            <Zap className="h-3 w-3 fill-current" />
            -{flashSale.discount_percent}%
          </span>
        ) : displayOriginal != null && displayOriginal > displayPrice ? (
          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded z-10">
            -{Math.round(((displayOriginal - displayPrice) / displayOriginal) * 100)}%
          </span>
        ) : null}

        {flashSale && (
          <div className="absolute bottom-2 left-2 z-10">
            <FlashSaleCountdown endsAt={flashSale.ends_at} compact />
          </div>
        )}


        {/* Color swatches disabled on cards — colors chosen on product detail page */}
      </div>
      <div className="px-3 py-3 md:px-4 md:py-3 flex flex-col h-full">
        {product.brandName && (
          <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">{product.brandName}</p>
        )}
        <h3 className="text-sm md:text-sm text-foreground line-clamp-2 leading-snug font-medium min-h-[2.6em] flex-grow">
          {product.name}
        </h3>
        <RatingRow productId={product.id} />
        <div className="mt-2 flex items-baseline gap-1.5 flex-nowrap min-h-[1.5rem]">
          {hasValidPrice ? (
            <>
              <span className={`font-extrabold text-base md:text-base whitespace-nowrap ${flashSale ? "text-destructive" : "text-foreground"}`}>
                {formatPrice(displayPrice)}
              </span>
              {displayOriginal != null && displayOriginal > displayPrice && (
                <span className="text-muted-foreground text-[10px] md:text-xs line-through whitespace-nowrap">
                  {formatPrice(displayOriginal)}
                </span>
              )}
            </>
          ) : (
            <span className="font-extrabold text-base md:text-base whitespace-nowrap text-foreground">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>


    </a>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
