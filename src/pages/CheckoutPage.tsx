import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useState } from "react";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";

const CheckoutPage = () => {
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [ordered, setOrdered] = useState(false);

  if (ordered) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
        <CheckCircle className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-xl font-bold text-foreground">Захиалга амжилттай!</h1>
        <p className="text-muted-foreground mt-2 text-center">Таны захиалгыг хүлээн авлаа. Бид тантай удахгүй холбогдох болно.</p>
        <Button className="mt-6" onClick={() => navigate("/")}>Нүүр хуудас</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary pb-16">
      <Header />
      <div className="p-4 space-y-4">
        <h1 className="text-lg font-bold text-foreground">Захиалга баталгаажуулах</h1>

        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <h2 className="font-semibold text-foreground">Захиалгын мэдээлэл</h2>
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{product.name} x{quantity}</span>
              <span className="text-foreground font-medium">{formatPrice(product.price * quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-bold">Нийт</span>
            <span className="font-bold text-primary">{formatPrice(cartTotal)}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <h2 className="font-semibold text-foreground">Хүргэлтийн мэдээлэл</h2>
          <input
            placeholder="Нэр"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            placeholder="Утасны дугаар"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            placeholder="Хаяг"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base"
          onClick={() => {
            clearCart();
            setOrdered(true);
          }}
        >
          Захиалга өгөх — {formatPrice(cartTotal)}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
};

export default CheckoutPage;
