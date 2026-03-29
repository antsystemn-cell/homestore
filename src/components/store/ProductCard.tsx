import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";

interface Props {
  product: Product;
}

const ProductCard = React.memo(({ product }: Props) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const handleClick = useCallback(() => {
    navigate(`/product/${product.id}`);
  }, [navigate, product.id]);

  const handleImgError = useCallback(() => setImgError(true), []);

  const imgSrc = imgError ? "/placeholder.svg" : product.image;

  return (
    <div
      className="cursor-pointer group transition-all duration-200 animate-fade-in"
      onClick={handleClick}
    >
      <div className="relative aspect-square bg-surface-container overflow-hidden rounded-xl md:rounded-2xl">
        <img
          src={imgSrc}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          width={300}
          height={300}
          onError={handleImgError}
        />
        {product.originalPrice != null && product.originalPrice > product.price && (
          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">
            -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
          </span>
        )}
      </div>
      <div className="mt-2.5 md:px-1">
        <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium">{product.category}</p>
        <h3 className="text-xs md:text-sm text-foreground line-clamp-2 leading-snug font-medium mt-0.5">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-1.5 flex-nowrap">
          <span className="font-display text-foreground font-extrabold text-sm md:text-base whitespace-nowrap">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice != null && product.originalPrice > product.price && (
            <span className="text-muted-foreground text-[10px] md:text-xs line-through whitespace-nowrap">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
