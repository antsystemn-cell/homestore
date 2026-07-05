import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/data/products";
import ProductCard from "./ProductCard";
import ErrorBoundary from "./ErrorBoundary";

interface Brand {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface Props {
  title?: string;
  products: Product[];
  brands?: Brand[];
}

const BrandTile = ({ brand }: { brand: Brand }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/${brand.name.replace(/\s+/g, "")}`)}
      className="bg-card overflow-hidden group transition-all duration-200 hover:shadow-lg rounded-none md:rounded-xl animate-fade-in block text-left w-full"
    >
      <div className="relative aspect-square bg-secondary overflow-hidden flex items-center justify-center">
        {brand.logo_url ? (
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

const ProductGrid = React.memo(({ products, brands }: Props) => {
  const items = useMemo(() => {
    const list: Array<
      { kind: "product"; product: Product } | { kind: "brand"; brand: Brand }
    > = products.map((p) => ({ kind: "product" as const, product: p }));

    if (brands && brands.length > 0 && list.length > 0) {
      const seed = hashString(products.map((p) => p.id).join("|"));
      brands.forEach((b, idx) => {
        // Pseudo-random position based on seed + brand id — stable across re-renders.
        const rand = hashString(b.id + ":" + seed + ":" + idx);
        // Keep first ~2 slots as products so the grid opens with products.
        const minPos = Math.min(2, list.length);
        const range = list.length - minPos + 1;
        const pos = minPos + (rand % Math.max(range, 1));
        list.splice(pos, 0, { kind: "brand", brand: b });
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
              <BrandTile brand={it.brand} />
            </ErrorBoundary>
          )
        )}
      </div>
    </div>
  );
});

ProductGrid.displayName = "ProductGrid";

export default ProductGrid;
