import { Product } from "@/data/products";
import ProductCard from "./ProductCard";

interface Props {
  title?: string;
  products: Product[];
}

const ProductGrid = ({ products }: Props) => (
  <div className="grid grid-cols-2 gap-[1px] bg-border">
    {products.map((p) => (
      <ProductCard key={p.id} product={p} />
    ))}
  </div>
);

export default ProductGrid;
