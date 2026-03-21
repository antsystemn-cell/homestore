import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import { products } from "@/data/products";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      <ProductGrid products={products} />
      <BottomNav />
    </div>
  );
};

export default Index;
