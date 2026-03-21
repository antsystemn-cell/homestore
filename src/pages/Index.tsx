import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import BottomNav from "@/components/store/BottomNav";
import { products } from "@/data/products";

const Index = () => {
  const saleProducts = products.filter((p) => p.isOnSale);
  const newProducts = products.filter((p) => p.isNew);

  return (
    <div className="min-h-screen bg-secondary pb-16">
      <Header />
      <ProductGrid title="🔥 Онцгой хямдрал" products={saleProducts} />
      {newProducts.length > 0 && (
        <ProductGrid title="🆕 Шинэ бараа" products={newProducts} />
      )}
      <ProductGrid title="⭐ Эрэлттэй бараа" products={products} />
      <BottomNav />
    </div>
  );
};

export default Index;
