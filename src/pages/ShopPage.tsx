import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import { products } from "@/data/products";

const ShopPage = () => (
  <div className="min-h-screen bg-secondary pb-16 md:pb-0">
    <Header />
    <ProductGrid title="Бүх бараа" products={products} />
    <BottomNav />
  </div>
);

export default ShopPage;
