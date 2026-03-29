import React from "react";
import { Product } from "@/data/products";
import ProductCard from "./ProductCard";
import ErrorBoundary from "./ErrorBoundary";

interface Props {
  title?: string;
  products: Product[];
}

const ProductGrid = React.memo(({ products }: Props) => (
  <div className="max-w-6xl mx-auto md:px-8 md:py-6">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-5">
      {products.map((p) => (
        <ErrorBoundary key={p.id}>
          <ProductCard product={p} />
        </ErrorBoundary>
      ))}
    </div>
  </div>
));

ProductGrid.displayName = "ProductGrid";

export default ProductGrid;