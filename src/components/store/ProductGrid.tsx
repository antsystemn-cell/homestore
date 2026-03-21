import { ChevronRight } from "lucide-react";
import { Product } from "@/data/products";
import ProductCard from "./ProductCard";

interface Props {
  title: string;
  products: Product[];
}

const ProductGrid = ({ title, products }: Props) => (
  <section className="px-4 py-4">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      <button className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
        Бүгд <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  </section>
);

export default ProductGrid;
