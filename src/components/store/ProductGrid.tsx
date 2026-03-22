import { Product } from "@/data/products";
import ProductCard from "./ProductCard";

interface Props {
  title?: string;
  products: Product[];
}

const ProductGrid = ({ products }: Props) => (
  <div className="max-w-6xl mx-auto md:px-8 md:py-6">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  </div>
);

export default ProductGrid;
