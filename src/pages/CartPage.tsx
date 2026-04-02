import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
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
    <div className="min-h-screen bg-secondary pb-16 md:pb-0">
      <Header />
      <div className="max-w-6xl mx-auto p-4 md:px-8 md:py-8">
        <h1 className="text-lg md:text-2xl font-bold text-foreground mb-4 md:mb-6">Миний сагс</h1>

        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg">Сагс хоосон байна</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Дэлгүүр үзэх
            </Button>
          </div>
        ) : (
          <div className="md:grid md:grid-cols-3 md:gap-8">
            {/* Cart items */}
            <div className="md:col-span-2 space-y-3">
              {items.map((item) => {
                const { product, quantity, selectedColor, selectedSize } = item;
                const key = `${product.id}__${selectedColor || ""}__${selectedSize || ""}`;
                return (
                <div key={key} className="bg-card rounded-xl p-3 md:p-4 flex gap-3 md:gap-5 border border-border">
                  <img
                    src={
                      selectedColor && product.colors?.find(c => c.name === selectedColor)?.image
                        ? product.colors.find(c => c.name === selectedColor)!.image
                        : product.image
                    }
                    alt={product.name}
                    className="w-20 h-20 md:w-28 md:h-28 rounded-lg object-cover bg-secondary cursor-pointer"
                    onClick={() => navigate(`/product/${product.slug || product.id}`)}
                  />
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-sm md:text-base font-medium text-foreground truncate cursor-pointer hover:underline"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      {product.name}
                    </h3>
                    {(selectedColor || selectedSize) && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedColor && (
                          <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">Өнгө: {selectedColor}</span>
                        )}
                        {selectedSize && (
                          <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">Хэмжээ: {selectedSize}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-foreground font-bold text-sm md:text-lg">{formatPrice(product.price)}</span>
                      {quantity > 1 && (
                        <span className="text-xs text-muted-foreground">× {quantity} = {formatPrice(product.price * quantity)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 md:mt-3">
                      <div className="flex items-center gap-0">
                        <button
                          className="w-8 h-8 md:w-9 md:h-9 rounded-l-xl border-2 border-border bg-secondary text-foreground flex items-center justify-center hover:bg-accent transition-colors"
                          onClick={() => updateQuantity(key, quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 h-8 md:h-9 flex items-center justify-center text-sm font-semibold border-y-2 border-border bg-card text-foreground">
                          {quantity}
                        </span>
                        <button
                          className="w-8 h-8 md:w-9 md:h-9 rounded-r-xl border-2 border-border bg-secondary text-foreground flex items-center justify-center hover:bg-accent transition-colors"
                          onClick={() => updateQuantity(key, quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(key)} className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Order summary sidebar */}
            <div className="md:col-span-1 mt-4 md:mt-0">
              <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-3 md:sticky md:top-20">
                <h2 className="font-bold text-foreground md:text-lg">Захиалгын дүн</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Нийт дүн</span>
                  <span className="font-bold text-foreground">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Хүргэлт</span>
                  <span className="text-primary font-medium">Үнэгүй</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-bold text-foreground">Төлөх дүн</span>
                  <span className="font-extrabold text-foreground text-lg">{formatPrice(cartTotal)}</span>
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base rounded-xl mt-2"
                  onClick={() => navigate("/checkout")}
                >
                  Захиалга өгөх
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default CartPage;
