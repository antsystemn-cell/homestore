import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";

interface Props {
  product: Product;
}

// Map Mongolian / common color names to hex
const COLOR_HEX: Record<string, string> = {
  // Mongolian (Cyrillic)
  "хар": "#1a1a1a", "цагаан": "#f5f5f5", "улаан": "#e53e3e", "шар": "#ecc94b",
  "ногоон": "#38a169", "цэнхэр": "#3182ce", "хөх": "#2b6cb0", "ягаан": "#f4a6c0",
  "саарал": "#a0aec0", "бор": "#8B4513", "ягаан алтан": "#e8a0bf",
  "алтан": "#d4a84b", "мөнгөн": "#c0c0c0", "мөнгөлөг": "#c0c0c0",
  "улбар шар": "#ed8936", "нил ягаан": "#805ad5", "тунгалаг": "#e2e8f0",
  "ил": "#e2e8f0", "цайвар": "#f5f0e1", "хүрэн": "#7b3f00",
  "тэнгэр": "#87ceeb", "цэнхэр хөх": "#2b6cb0", "номин": "#1a365d",
  "час улаан": "#c53030", "ногоон цэнхэр": "#319795", "оливын": "#808000",
  "шаргал": "#f6e05e", "хүрэн улаан": "#9b2c2c", "хар хөх": "#1a365d",
  "цайвар саарал": "#cbd5e0", "хар саарал": "#4a5568",
  "цайвар ягаан": "#fbb6ce", "цайвар цэнхэр": "#90cdf4",
  "цайвар ногоон": "#9ae6b4", "хүүхэн хар": "#2d3748",
  // English
  "black": "#1a1a1a", "white": "#f5f5f5", "red": "#e53e3e", "blue": "#3182ce",
  "green": "#38a169", "yellow": "#ecc94b", "pink": "#f4a6c0", "gray": "#a0aec0",
  "grey": "#a0aec0", "brown": "#8B4513", "orange": "#ed8936", "purple": "#805ad5",
  "gold": "#d4a84b", "silver": "#c0c0c0", "beige": "#f5f0e1", "navy": "#1a365d",
  "cream": "#fffdd0", "rose": "#e8a0bf", "coral": "#f56565",
  "khaki": "#c3b091", "olive": "#808000", "maroon": "#800000", "teal": "#319795",
  "cyan": "#06b6d4", "magenta": "#d53f8c", "violet": "#805ad5",
  "ivory": "#fffff0", "tan": "#d2b48c", "mint": "#9ae6b4", "lime": "#84cc16",
  "indigo": "#4338ca", "lavender": "#e6e6fa", "turquoise": "#40e0d0",
  "transparent": "#e2e8f0", "clear": "#e2e8f0", "multicolor": "#888",
};

function normalizeColorName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/өнгө(тэй|нтэй|ний)?/g, " ") // strip "өнгө" + suffix variants
    .replace(/colou?r/g, " ")
    .replace(/[^a-zа-яёөү\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Deterministic fallback color from string hash
function hashToHex(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

function getColorHex(name: string): string {
  const raw = (name || "").toLowerCase().trim();
  if (!raw) return "#cccccc";
  if (COLOR_HEX[raw]) return COLOR_HEX[raw];

  const normalized = normalizeColorName(name);
  if (COLOR_HEX[normalized]) return COLOR_HEX[normalized];

  // Try multi-word combinations (longest first)
  const words = normalized.split(" ").filter(Boolean);
  for (let len = words.length; len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const combo = words.slice(i, i + len).join(" ");
      if (COLOR_HEX[combo]) return COLOR_HEX[combo];
    }
  }

  // Inline hex like "#ff0000" inside the name
  const hexMatch = raw.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
  if (hexMatch) return hexMatch[0];

  // Deterministic fallback so same name always gets same color
  return hashToHex(normalized || raw);
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
              const hex = getColorHex(c.name);
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
                    backgroundColor: hex || "#ccc",
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
