import { Product } from "@/data/products";
import ProductCard from "./ProductCard";

interface Props {
  title: string;
  products: Product[];
}

const ProductGrid = ({ title, products }: Props) => (
  <section className="px-4 py-3">
    <h2 className="text-base font-bold text-foreground mb-3">{title}</h2>
    <div className="grid grid-cols-2 gap-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  </section>
);

export default ProductGrid;
