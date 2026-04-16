import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";

interface Props {
  product: Product;
}

// Map Mongolian / common color names to hex
const COLOR_HEX: Record<string, string> = {
  "хар": "#1a1a1a", "цагаан": "#f5f5f5", "улаан": "#e53e3e", "шар": "#ecc94b",
  "ногоон": "#38a169", "цэнхэр": "#3182ce", "хөх": "#2b6cb0", "ягаан": "#d53f8c",
  "саарал": "#a0aec0", "бор": "#8B4513", "ягаан алтан": "#e8a0bf",
  "алтан": "#d4a84b", "мөнгөн": "#c0c0c0", "улбар шар": "#ed8936",
  "нил ягаан": "#805ad5", "тунгалаг": "#e2e8f0",
  "black": "#1a1a1a", "white": "#f5f5f5", "red": "#e53e3e", "blue": "#3182ce",
  "green": "#38a169", "yellow": "#ecc94b", "pink": "#d53f8c", "gray": "#a0aec0",
  "grey": "#a0aec0", "brown": "#8B4513", "orange": "#ed8936", "purple": "#805ad5",
  "gold": "#d4a84b", "silver": "#c0c0c0", "beige": "#f5f0e1", "navy": "#1a365d",
  "cream": "#fffdd0", "rose": "#e8a0bf", "coral": "#f56565",
};

function getColorHex(name: string): string | null {
  const lower = name.toLowerCase().trim();
  return COLOR_HEX[lower] || null;
}

const ProductCard = React.memo(({ product }: Props) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [activeColorIdx, setActiveColorIdx] = useState<number | null>(null);

  const handleImgError = useCallback(() => setImgError(true), []);

  const productUrl = `/product/${product.slug || product.id}`;

  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      navigate(productUrl);
    }
  }, [navigate, productUrl]);

  // Determine displayed image: active color image or default
  const colors = product.colors;
  const hasColors = colors && colors.length > 1;
  const colorImage = activeColorIdx !== null && colors?.[activeColorIdx]?.image;
  const displaySrc = imgError
    ? "/placeholder.svg"
    : colorImage || product.thumbnail || product.image;

  return (
    <a
      href={productUrl}
      className="bg-card overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-lg rounded-none md:rounded-xl animate-fade-in block no-underline text-inherit"
      onClick={handleLinkClick}
    >
      <div className="relative aspect-square bg-secondary overflow-hidden">
        <img
          src={displaySrc}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
          width={300}
          height={300}
          onError={handleImgError}
        />
        {product.isBogo && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded">
            1+1
          </span>
        )}
        {product.originalPrice != null && product.originalPrice > product.price && (
          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded">
            -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
          </span>
        )}

        {/* Color swatches overlay */}
        {hasColors && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
            {colors.slice(0, 6).map((c, i) => {
              const hex = getColorHex(c.name);
              return (
                <button
                  key={i}
                  type="button"
                  title={c.name}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveColorIdx(activeColorIdx === i ? null : i);
                  }}
                  className={`w-4.5 h-4.5 md:w-5.5 md:h-5.5 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
                    activeColorIdx === i
                      ? "border-primary ring-2 ring-primary/30 scale-110"
                      : "border-white/80 hover:border-primary/60"
                  }`}
                  style={{
                    backgroundColor: hex || "#ccc",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    width: hex ? undefined : undefined,
                  }}
                />
              );
            })}
            {colors.length > 6 && (
              <span className="text-[9px] text-white font-medium bg-black/50 rounded-full px-1.5 py-0.5">
                +{colors.length - 6}
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
