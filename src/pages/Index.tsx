import Header from "@/components/store/Header";
import CategoryNav from "@/components/store/CategoryNav";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import { products } from "@/data/products";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-14">
      <Header />
      <CategoryNav />
      <ProductGrid products={products} />
      <BottomNav />
    </div>
  );
};

export default Index;
