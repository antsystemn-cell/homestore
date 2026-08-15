import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/data/products";
import ProductCard from "./ProductCard";
import ErrorBoundary from "./ErrorBoundary";
import { transformImage } from "@/lib/imageUrl";
import { useDominantColor } from "@/hooks/useDominantColor";
import { blendModeForColor } from "@/lib/dominantColor";

interface Brand {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface Props {
  title?: string;
  products: Product[];
  brands?: Brand[];
  /** Full catalog used to pick each brand's slideshow images. Falls back to `products`. */
  allProducts?: Product[];
}

const BrandTile = ({ brand, brandProducts }: { brand: Brand; brandProducts: Product[] }) => {
  const navigate = useNavigate();
  const slides = useMemo(
    () =>
      brandProducts
        .map((p) => p.thumbnail || p.image)
        .filter((u): u is string => !!u && u !== "/placeholder.svg")
        .slice(0, 8),
    [brandProducts]
  );

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 2500);
    return () => clearInterval(t);
  }, [slides.length]);

  const dominant = useDominantColor(brand.logo_url);
  const blend = blendModeForColor(dominant);

  return (
    <button
      type="button"
      onClick={() => navigate(`/${brand.name.replace(/\s+/g, "")}`)}
      className="bg-card overflow-hidden group transition-all duration-200 hover:shadow-lg rounded-none md:rounded-xl animate-fade-in flex flex-col text-left w-full"
    >
      <div
        className="relative aspect-square overflow-hidden flex items-center justify-center bg-white"
      >
        {slides.length > 0 ? (
          <>
            {slides.map((src, i) => (
              <img
                key={src + i}
                src={transformImage(src, 400)}
                alt={brand.name}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                  i === idx ? "opacity-100" : "opacity-0"
                }`}
                loading="lazy"
              />
            ))}
            {slides.length > 1 && (
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === idx ? "w-3 bg-white" : "w-1 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : brand.logo_url ? (
          <img
            src={brand.logo_url}
            alt={brand.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl font-bold text-muted-foreground">
            {brand.name.charAt(0)}
          </span>
        )}
        <span className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded z-10">
          Брэнд
        </span>
        {slides.length > 0 && brand.logo_url && (
          <div className="absolute bottom-0 left-0 z-10 w-1/2 aspect-square flex items-center justify-center">
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              loading="lazy"
            />
          </div>
        )}

      </div>
      <div className="px-3 py-2.5 md:px-4 md:py-3 flex flex-col flex-1">
        <h3 className="text-xs md:text-sm text-foreground line-clamp-2 leading-snug font-medium min-h-[2.6em]">
          {brand.name}
        </h3>
        <div className="mt-auto pt-2 text-[10px] md:text-xs text-muted-foreground">
          Бүх бараагаар үзэх →
        </div>
      </div>
    </button>
  );
};

// Deterministic hash so brand placement is stable per page render (based on ids).
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ProductGrid = React.memo(({ products, brands, allProducts }: Props) => {
  const source = allProducts && allProducts.length > 0 ? allProducts : products;
  const productsByBrand = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of source) {
      if (!p.brand_id) continue;
      const arr = map.get(p.brand_id) || [];
      arr.push(p);
      map.set(p.brand_id, arr);
    }
    return map;
  }, [source]);

  const items = useMemo(() => {
    const list: Array<
      { kind: "product"; product: Product } | { kind: "brand"; brand: Brand }
    > = products.map((p) => ({ kind: "product" as const, product: p }));

    if (brands && brands.length > 0 && list.length > 0) {
      // Show EVERY brand on EVERY page: spread all brand tiles evenly across the
      // currently visible product slice instead of using a fixed global interval
      // (which only ever surfaced ~2 brands per page).
      const visibleCount = products.length;
      const seed = hashString(brands.map((b) => b.id).join("|"));
      const shuffled = [...brands].sort(
        (a, b) => (hashString(a.id + seed) % 1000) - (hashString(b.id + seed) % 1000)
      );

      const count = Math.min(shuffled.length, Math.max(1, Math.floor(visibleCount / 3)));
      const step = visibleCount / (count + 1);

      const placements = Array.from({ length: count }, (_, i) => ({
        brand: shuffled[i % shuffled.length],
        pos: Math.min(visibleCount, Math.max(1, Math.round((i + 1) * step))),
      })).sort((a, b) => b.pos - a.pos);

      placements.forEach(({ brand, pos }) => {
        list.splice(pos, 0, { kind: "brand", brand });
      });
    }
    // Trim to a multiple of 4 so each row on desktop (lg: 4 cols) is fully filled.
    // Brand tiles inserted above can leave 1–3 orphans on the last row otherwise.
    const trimmed = list.length - (list.length % 4);
    return list.slice(0, trimmed);
  }, [products, brands, source.length]);


  return (
    <div className="max-w-6xl mx-auto md:px-8 md:py-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-5">
        {items.map((it, i) =>
          it.kind === "product" ? (
            <ErrorBoundary key={`p-${it.product.id}`}>
              <ProductCard product={it.product} priority={i < 4} />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary key={`b-${it.brand.id}-${i}`}>
              <BrandTile
                brand={it.brand}
                brandProducts={productsByBrand.get(it.brand.id) || []}
              />
            </ErrorBoundary>
          )
        )}
      </div>
    </div>
  );
});

ProductGrid.displayName = "ProductGrid";

export default ProductGrid;
