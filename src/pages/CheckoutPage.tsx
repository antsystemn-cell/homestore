import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import { CheckCircle, Lock, Loader2, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";

const CheckoutPage = () => {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");

  // Delivery options
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [loadingDelivery, setLoadingDelivery] = useState(true);

  useEffect(() => {
    const fetchDelivery = async () => {
      const { data } = await supabase
        .from("delivery_options")
        .select("*")
        .eq("is_active", true)
        .order("position");
      setDeliveryOptions(data || []);
      if (data && data.length > 0) {
        setSelectedDelivery(data[0].id);
      }
      setLoadingDelivery(false);
    };
    fetchDelivery();
  }, []);

  const selectedDeliveryOption = deliveryOptions.find(d => d.id === selectedDelivery);
  const deliveryFee = selectedDeliveryOption?.price || 0;
  const grandTotal = cartTotal + deliveryFee;

  const handleOrder = async () => {
    if (!user) { toast.error("Нэвтэрсэн байх шаардлагатай"); navigate("/auth"); return; }
    if (!phone.trim() || !address.trim()) { toast.error("Утас, хаяг заавал бөглөнө үү"); return; }
    if (deliveryOptions.length > 0 && !selectedDelivery) { toast.error("Хүргэлтийн сонголт хийнэ үү"); return; }
    setSubmitting(true);
    const orderItems = items.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      color: item.selectedColor || null,
      size: item.selectedSize || null,
      image: item.product.image,
    }));
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      items: orderItems as any,
      total: grandTotal,
      phone: phone,
      shipping_address: address,
      status: "pending",
      delivery_option_id: selectedDelivery || null,
      delivery_fee: deliveryFee,
    });
    if (error) {
      toast.error("Захиалга өгөхөд алдаа гарлаа");
      setSubmitting(false);
      return;
    }
    clearCart();
    setOrdered(true);
    setSubmitting(false);
  };

  if (ordered) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Захиалга амжилттай!</h1>
          <p className="text-muted-foreground mt-2">Таны захиалгыг хүлээн авлаа. Бид тантай удахгүй холбогдох болно.</p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate("/")}>Нүүр хуудас</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary pb-16 md:pb-0">
      <Header />
      <div className="max-w-6xl mx-auto p-4 md:px-8 md:py-8">
        <h1 className="text-lg md:text-2xl font-bold text-foreground mb-4 md:mb-6">Захиалга баталгаажуулах</h1>

        <div className="md:grid md:grid-cols-3 md:gap-8">
          {/* Shipping form */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-4">
              <h2 className="font-semibold text-foreground md:text-lg">Хүргэлтийн мэдээлэл</h2>
              <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
                <input
                  placeholder="Нэр"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  placeholder="Утасны дугаар"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <input
                placeholder="Хаяг"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                placeholder="Нэмэлт тэмдэглэл (заавал биш)"
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Delivery Options */}
            {!loadingDelivery && deliveryOptions.length > 0 && (
              <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-3">
                <h2 className="font-semibold text-foreground md:text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Хүргэлтийн сонголт
                </h2>
                <div className="space-y-2">
                  {deliveryOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedDelivery === opt.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value={opt.id}
                        checked={selectedDelivery === opt.id}
                        onChange={() => setSelectedDelivery(opt.id)}
                        className="w-4 h-4 text-primary accent-[hsl(var(--primary))]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{opt.name}</p>
                          <span className="text-sm font-bold text-primary shrink-0 ml-2">
                            {opt.price > 0 ? formatPrice(opt.price) : "Үнэгүй"}
                          </span>
                        </div>
                        {opt.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Хүргэх хугацаа: {opt.estimated_days_min}-{opt.estimated_days_max} хоног
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="md:col-span-1 mt-4 md:mt-0">
            <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-3 md:sticky md:top-20">
              <h2 className="font-bold text-foreground md:text-lg">Захиалгын мэдээлэл</h2>
              {items.map((item) => {
                const { product, quantity, selectedColor, selectedSize } = item;
                const key = `${product.id}__${selectedColor || ""}__${selectedSize || ""}`;
                return (
                <div key={key} className="flex items-center gap-3 py-2">
                  <img src={product.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                    {(selectedColor || selectedSize) && (
                      <p className="text-[10px] text-muted-foreground">
                        {[selectedColor && `Өнгө: ${selectedColor}`, selectedSize && `Хэмжээ: ${selectedSize}`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">x{quantity}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground shrink-0">{formatPrice(product.price * quantity)}</span>
                </div>
                );
              })}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Барааны дүн</span>
                  <span className="text-foreground font-medium">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Хүргэлт</span>
                  <span className={`font-medium ${deliveryFee > 0 ? 'text-foreground' : 'text-primary'}`}>
                    {deliveryFee > 0 ? formatPrice(deliveryFee) : "Үнэгүй"}
                  </span>
                </div>
                {selectedDeliveryOption && (
                  <p className="text-[10px] text-muted-foreground">
                    {selectedDeliveryOption.name} · {selectedDeliveryOption.estimated_days_min}-{selectedDeliveryOption.estimated_days_max} хоног
                  </p>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-bold text-foreground">Нийт</span>
                  <span className="font-extrabold text-foreground text-lg">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base rounded-xl mt-2 gap-2"
                disabled={submitting}
                onClick={handleOrder}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {submitting ? "Илгээж байна..." : `Захиалга өгөх — ${formatPrice(grandTotal)}`}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Таны мэдээлэл аюулгүй хадгалагдана
              </p>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default CheckoutPage;