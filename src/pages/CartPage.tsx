import { Minus, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";

const CartPage = () => {
  const { items, updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary pb-16">
      <Header />
      <div className="p-4">
        <h1 className="text-lg font-bold text-foreground mb-4">Миний сагс</h1>

        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">Сагс хоосон байна</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Дэлгүүр үзэх
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="bg-card rounded-xl p-3 flex gap-3 border border-border">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-20 h-20 rounded-lg object-cover bg-secondary"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{product.name}</h3>
                  <p className="text-primary font-bold text-sm mt-1">{formatPrice(product.price)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-secondary rounded-full">
                      <button
                        className="p-1.5 rounded-full hover:bg-accent"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                      <button
                        className="p-1.5 rounded-full hover:bg-accent"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(product.id)} className="text-sale p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-card rounded-xl p-4 border border-border space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Нийт дүн</span>
                <span className="font-bold text-foreground">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Хүргэлт</span>
                <span className="text-primary font-medium">Үнэгүй</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-bold text-foreground">Төлөх дүн</span>
                <span className="font-bold text-primary text-lg">{formatPrice(cartTotal)}</span>
              </div>
            </div>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base"
              onClick={() => navigate("/checkout")}
            >
              Захиалга өгөх
            </Button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default CartPage;
