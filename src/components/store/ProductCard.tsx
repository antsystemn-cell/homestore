import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { getColorHex } from "@/lib/colorMap";

interface Props {
  product: Product;
}

const ProductCard = React.memo(({ product }: Props) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [pinnedColorIdx, setPinnedColorIdx] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const handleImgError = useCallback(() => setImgError(true), []);

  const productUrl = `/product/${product.slug || product.id}`;

  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      navigate(productUrl);
    }
  }, [navigate, productUrl]);

  const colors = product.colors;
  const baseImage = product.thumbnail || product.image || "/placeholder.svg";

  // Build slides: base image + every distinct color image
  const { slides, colorSlideMap } = useMemo(() => {
    const list: string[] = [baseImage];
    const map = new Map<number, number>(); // colorIdx -> slideIdx
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
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {hasMultipleSlides ? (
          <>
            <div
              ref={scrollerRef}
              className="w-full h-full flex overflow-x-auto md:overflow-hidden snap-x snap-mandatory no-scrollbar scroll-smooth"
              onScroll={handleScroll}
            >
              {slides.map((src, i) => (
                <div
                  key={i}
                  className="w-full h-full flex-shrink-0 snap-start"
                  style={{ minWidth: "100%" }}
                >
                  <img
                    src={imgError ? "/placeholder.svg" : src}
                    alt={`${product.name}${i > 0 ? ` - ${i + 1}` : ""}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    width={300}
                    height={300}
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
            src={fallbackSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
            width={300}
            height={300}
            onError={handleImgError}
          />
        )}

        {product.isBogo && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded z-10">
            1+1
          </span>
        )}
        {product.originalPrice != null && product.originalPrice > product.price && (
          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded z-10">
            -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
          </span>
        )}

        {/* Color swatches overlay */}
        {hasSwatches && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 z-10">
            {colors!.slice(0, 6).map((c, i) => {
              const scope = `${(product as any).product_code || product.id}::${(c as any).id ?? i}`;
              const hex = getColorHex(c.name, scope);
              const isPinned = pinnedColorIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  title={c.name}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPinnedColorIdx(isPinned ? null : i);
                  }}
                  className={`rounded-full border transition-all duration-200 flex-shrink-0 ${
                    isPinned
                      ? "border-primary ring-2 ring-primary/40 scale-110"
                      : "border-black/20 hover:border-primary/60"
                  }`}
                  style={{
                    backgroundColor: hex,
                    boxShadow: "0 0 0 1.5px rgba(255,255,255,0.95), 0 1px 3px rgba(0,0,0,0.4)",
                    width: 18,
                    height: 18,
                  }}
                />
              );
            })}
            {colors!.length > 6 && (
              <span className="text-[9px] text-white font-medium bg-black/50 rounded-full px-1.5 py-0.5">
                +{colors!.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="px-3 py-2.5 md:px-4 md:py-3">
        <h3 className="text-xs md:text-sm text-foreground line-clamp-2 leading-snug font-medium min-h-[2.5em]">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-1.5 flex-nowrap">
          <span className="text-foreground font-extrabold text-sm md:text-base whitespace-nowrap">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice != null && product.originalPrice > product.price && (
            <span className="text-muted-foreground text-[10px] md:text-xs line-through whitespace-nowrap">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
