import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/data/products";
import ProductCard from "./ProductCard";
import ErrorBoundary from "./ErrorBoundary";
import { transformImage } from "@/lib/imageUrl";

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

  return (
    <button
      type="button"
      onClick={() => navigate(`/${brand.name.replace(/\s+/g, "")}`)}
      className="bg-card overflow-hidden group transition-all duration-200 hover:shadow-lg rounded-none md:rounded-xl animate-fade-in block text-left w-full"
    >
      <div className="relative aspect-square bg-secondary overflow-hidden flex items-center justify-center">
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
            {brand.logo_url && (
              <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur rounded-xl p-2.5 md:p-3 shadow-lg">
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-12 md:h-16 w-auto object-contain"
                  loading="lazy"
                />
              </div>
            )}
            {slides.length > 1 && (
              <div className="absolute bottom-2 left-2 flex gap-1">
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
        <span className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded">
          Брэнд
        </span>
      </div>
      <div className="px-3 py-2.5 md:px-4 md:py-3">
        <h3 className="text-xs md:text-sm text-foreground line-clamp-2 leading-snug font-medium min-h-[2.5em]">
          {brand.name}
        </h3>
        <div className="mt-2 text-[10px] md:text-xs text-muted-foreground">
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
      const seed = hashString(products.map((p) => p.id).join("|"));
      const n = brands.length;
      const step = products.length / (n + 1);
      const placements = brands
        .map((b, idx) => {
          const jitter = (hashString(b.id + ":" + seed) % 3) - 1;
          const basePos = Math.round(step * (idx + 1)) + jitter;
          const minPos = Math.min(2, products.length);
          const pos = Math.max(minPos, Math.min(products.length, basePos));
          return { brand: b, pos };
        })
        .sort((a, b) => b.pos - a.pos);
      placements.forEach(({ brand, pos }) => {
        list.splice(pos, 0, { kind: "brand", brand });
      });
    }
    return list;
  }, [products, brands]);

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
