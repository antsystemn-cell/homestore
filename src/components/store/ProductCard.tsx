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
    navigate(`/product/${product.slug || product.id}`);
  }, [navigate, product.slug, product.id]);

  const handleImgError = useCallback(() => setImgError(true), []);

  const imgSrc = imgError ? "/placeholder.svg" : (product.thumbnail || product.image);

  const productUrl = `/product/${product.slug || product.id}`;

  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      navigate(productUrl);
    }
  }, [navigate, productUrl]);

  return (
    <a
      href={productUrl}
      className="bg-card overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-lg rounded-none md:rounded-xl animate-fade-in block no-underline text-inherit"
      onClick={handleLinkClick}
    >
      <div className="relative aspect-square bg-secondary overflow-hidden">
        <img
          src={imgSrc}
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