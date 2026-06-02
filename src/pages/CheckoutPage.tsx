import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import { CheckCircle, Lock, Loader2, Truck, Banknote, CreditCard, Copy, UserPlus, QrCode, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";
import StorepayPayment from "@/components/store/StorepayPayment";
import QPayPayment from "@/components/store/QPayPayment";
import PocketPayment from "@/components/store/PocketPayment";
import { track, attachLeadContact } from "@/lib/tracking";
import { useBundleFreeDelivery } from "@/lib/bundleDelivery";
import { hasFreeDeliveryProduct } from "@/lib/freeDeliveryProducts";

type PaymentMethod = "cash" | "storepay" | "qpay" | "pocket";

const CheckoutPage = () => {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGuestCheckout = !user && searchParams.get("guest") === "1";

  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qpay");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);

  // Delivery options
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [loadingDelivery, setLoadingDelivery] = useState(true);

  // Payment provider logos from DB
  const [providerLogos, setProviderLogos] = useState<Record<string, string>>({});

  // Redirect unauthenticated non-guest users
  useEffect(() => {
    if (!user && !isGuestCheckout) {
      navigate("/cart");
    }
  }, [user, isGuestCheckout, navigate]);

  // Track checkout start once
  useEffect(() => {
    if (items.length > 0) {
      track("checkout_start", { value: cartTotal, metadata: { items: items.length } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const fetchProviderLogos = async () => {
      const { data } = await supabase
        .from("payment_providers")
        .select("name, logo_url")
        .eq("is_active", true);
      if (data) {
        const logos: Record<string, string> = {};
        for (const p of data) {
          const key = p.name?.toLowerCase().replace(/\s/g, "");
          if (key && p.logo_url) logos[key] = p.logo_url;
        }
        setProviderLogos(logos);
      }
    };
    fetchDelivery();
    fetchProviderLogos();
  }, []);

  const selectedDeliveryOption = deliveryOptions.find(d => d.id === selectedDelivery);
  const deliveryFee = selectedDeliveryOption?.price || 0;

  // Extra 8,000₮ delivery surcharge: if cart total < 50,000₮ OR cart has any sale items
  const hasSaleItems = items.some(item => item.product.isOnSale || (item.product.discount && item.product.discount > 0));
  const { eligible: bundleFree } = useBundleFreeDelivery(cartTotal, items.length);
  const productFree = hasFreeDeliveryProduct(items);
  const surcharge = (bundleFree || productFree) ? 0 : ((cartTotal < 50000 || hasSaleItems) ? 8000 : 0);
  const totalDeliveryFee = deliveryFee + surcharge;
  const grandTotal = cartTotal + totalDeliveryFee;

  const createOrder = async (paymentStatus = "unpaid", pm: PaymentMethod = "cash") => {
    if (!phone.trim() || !address.trim()) { toast.error("Утас, хаяг заавал бөглөнө үү"); return null; }
    if (isGuestCheckout && !name.trim()) { toast.error("Нэр заавал бөглөнө үү"); return null; }
    if (deliveryOptions.length > 0 && !selectedDelivery) { toast.error("Хүргэлтийн сонголт хийнэ үү"); return null; }

    const orderItems = items.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      color: item.selectedColor || null,
      size: item.selectedSize || null,
      image: item.product.image,
      product_code: item.product.productCode || null,
      gift_package: item.selectedGiftPackage ? { id: item.selectedGiftPackage.id, name: item.selectedGiftPackage.name, items: item.selectedGiftPackage.items } : null,
    }));

    const orderData: any = {
      items: orderItems,
      total: grandTotal,
      phone,
      shipping_address: address,
      status: "pending",
      delivery_option_id: selectedDelivery || null,
      delivery_fee: totalDeliveryFee,
      payment_method: pm,
      payment_status: paymentStatus,
      source_note: note.trim() || null,
    };

    if (isGuestCheckout) {
      orderData.user_id = null;
      orderData.is_guest = true;
      orderData.guest_name = name.trim();
    } else {
      orderData.user_id = user!.id;
    }

    const { data, error } = await supabase
      .from("orders")
      .insert(orderData)
      .select("id, order_ref")
      .single();

    if (error) {
      console.error("Order error:", error);
      toast.error("Захиалга өгөхөд алдаа гарлаа");
      return null;
    }
    setOrderRef(data.order_ref);

    // NOTE: Delivery dispatch is handled automatically by the DB trigger
    // `auto_send_order_to_delivery` once payment_status='paid' (online)
    // or admin marks the order 'confirmed' (cash). No client-side call needed.

    // Track: invoice for online payments, purchase for cash
    const eventName = pm === "cash" ? "purchase" : "invoice_create";
    attachLeadContact({ phone, name: isGuestCheckout ? name : undefined });
    track(eventName, {
      value: grandTotal,
      metadata: { order_id: data.id, order_ref: data.order_ref, payment_method: pm },
    });

    return data.id;
  };

  const handleCashOrder = async () => {
    setSubmitting(true);
    const id = await createOrder("unpaid", "cash");
    if (id) {
      clearCart();
      setOrdered(true);
    }
    setSubmitting(false);
  };

  const handleStorepayStart = async () => {
    if (!phone.trim() || !address.trim()) { toast.error("Утас, хаяг заавал бөглөнө үү"); return; }
    if (isGuestCheckout && !name.trim()) { toast.error("Нэр заавал бөглөнө үү"); return; }
    if (deliveryOptions.length > 0 && !selectedDelivery) { toast.error("Хүргэлтийн сонголт хийнэ үү"); return; }

    setSubmitting(true);
    const id = await createOrder("pending", "storepay");
    setSubmitting(false);

    if (id) {
      setOrderId(id);
    }
  };

  const handleStorepaySuccess = () => {
    clearCart();
    setOrdered(true);
  };

  const handleStorepayCancel = () => {
    setOrderId(null);
    setPaymentMethod("cash");
  };

  const handleQPayStart = async () => {
    if (!phone.trim() || !address.trim()) { toast.error("Утас, хаяг заавал бөглөнө үү"); return; }
    if (isGuestCheckout && !name.trim()) { toast.error("Нэр заавал бөглөнө үү"); return; }
    if (deliveryOptions.length > 0 && !selectedDelivery) { toast.error("Хүргэлтийн сонголт хийнэ үү"); return; }

    setSubmitting(true);
    const id = await createOrder("processing", "qpay");
    setSubmitting(false);

    if (id) {
      setOrderId(id);
    }
  };

  const handleQPaySuccess = () => {
    clearCart();
    setOrdered(true);
  };

  const handleQPayCancel = () => {
    setOrderId(null);
    setPaymentMethod("cash");
  };

  const handlePocketStart = async () => {
    if (!phone.trim() || !address.trim()) { toast.error("Утас, хаяг заавал бөглөнө үү"); return; }
    if (isGuestCheckout && !name.trim()) { toast.error("Нэр заавал бөглөнө үү"); return; }
    if (deliveryOptions.length > 0 && !selectedDelivery) { toast.error("Хүргэлтийн сонголт хийнэ үү"); return; }

    setSubmitting(true);
    const id = await createOrder("processing", "pocket");
    setSubmitting(false);

    if (id) {
      setOrderId(id);
    }
  };

  const handlePocketSuccess = () => {
    clearCart();
    setOrdered(true);
  };

  const handlePocketCancel = () => {
    setOrderId(null);
    setPaymentMethod("cash");
  };

  // Guest order confirmation
  if (ordered && isGuestCheckout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Захиалга амжилттай!</h1>
          {orderRef && (
            <div className="mt-4 p-4 bg-secondary rounded-xl border border-border">
              <p className="text-xs text-muted-foreground mb-1">Захиалгын дугаар</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-bold text-foreground tracking-wider">{orderRef}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(orderRef);
                    toast.success("Хуулагдлаа");
                  }}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            Захиалгын дугаараа хадгалж авна уу. Бүртгүүлснээр захиалгынхаа явцыг хянах боломжтой.
          </p>
          <div className="flex flex-col gap-2 mt-6">
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={() => navigate("/auth")}
            >
              <UserPlus className="h-4 w-4" />
              Бүртгүүлэх
            </Button>
            <Button className="w-full rounded-xl" onClick={() => navigate("/")}>
              Нүүр хуудас
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated order confirmation (unchanged)
  if (ordered) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Захиалга амжилттай!</h1>
          <p className="text-muted-foreground mt-2">Таны захиалгыг хүлээн авлаа. Бид тантай удахгүй холбогдох болно.</p>
          {orderRef && (
            <p className="text-sm text-muted-foreground mt-2">
              Захиалгын дугаар: <span className="font-bold text-foreground">{orderRef}</span>
            </p>
          )}
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
          {/* Left column */}
          <div className="md:col-span-2 space-y-4">
            {/* Shipping form */}
            <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-4">
              <h2 className="font-semibold text-foreground md:text-lg">Хүргэлтийн мэдээлэл</h2>
              <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
                <input
                  placeholder="Нэр *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  placeholder="Утасны дугаар *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <input
                placeholder="Хаяг *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                placeholder="Нэмэлт тэмдэглэл — хүргэлт, бараа болон бусад хүсэлт (заавал биш)"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              {note.length > 0 && (
                <div className="text-[10px] text-muted-foreground/60 text-right -mt-2">{note.length}/500</div>
              )}
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
                        className="w-4 h-4 accent-[hsl(var(--primary))]"
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

            {/* Payment Method Selection */}
            <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-3">
              <h2 className="font-semibold text-foreground md:text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Төлбөрийн хэлбэр
              </h2>
              <div className="space-y-2">
                {/* QPay */}
                <label
                  className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "qpay"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="qpay"
                    checked={paymentMethod === "qpay"}
                    onChange={() => setPaymentMethod("qpay")}
                    className="w-4 h-4 accent-[hsl(var(--primary))]"
                  />
                  {providerLogos["qpay"] ? (
                    <img src={providerLogos["qpay"]} alt="QPay" className="w-9 h-9 rounded-lg object-contain" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-bold">Q</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">QPay</p>
                    <p className="text-xs text-muted-foreground">QR кодоор төлөх (бүх банк)</p>
                  </div>
                </label>

                {/* Storepay */}
                <label
                    className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border-2 transition-all ${
                      grandTotal < 100000
                        ? "border-border opacity-50 cursor-not-allowed"
                        : paymentMethod === "storepay"
                          ? "border-primary bg-primary/5 shadow-sm cursor-pointer"
                          : "border-border hover:border-muted-foreground/30 cursor-pointer"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="storepay"
                      checked={paymentMethod === "storepay"}
                      onChange={() => grandTotal >= 100000 && setPaymentMethod("storepay")}
                      disabled={grandTotal < 100000}
                      className="w-4 h-4 accent-[hsl(var(--primary))]"
                    />
                    {providerLogos["storepay"] ? (
                      <img src={providerLogos["storepay"]} alt="Storepay" className="w-9 h-9 rounded-lg object-contain" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-[#00B140] flex items-center justify-center">
                        <span className="text-white text-xs font-bold">S</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Storepay</p>
                      <p className="text-xs text-muted-foreground">Хуваан төлөх үйлчилгээ</p>
                      {grandTotal < 100000 && (
                        <p className="text-[11px] text-destructive mt-0.5">100,000₮ доош худалдан авалт боломжгүй байна</p>
                      )}
                    </div>
                  </label>

                {/* Pocket */}
                <label
                  className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "pocket"
                      ? "border-[#6C3FC5] bg-[#6C3FC5]/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="pocket"
                    checked={paymentMethod === "pocket"}
                    onChange={() => setPaymentMethod("pocket")}
                    className="w-4 h-4 accent-[#6C3FC5]"
                  />
                  {providerLogos["pocket"] ? (
                    <img src={providerLogos["pocket"]} alt="Pocket" className="w-9 h-9 rounded-lg object-contain" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#6C3FC5] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">P</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Pocket</p>
                    <p className="text-xs text-muted-foreground">Pocket апп-аар төлөх</p>
                  </div>
                </label>

              </div>
            </div>

            {/* Storepay Payment Flow */}
            {paymentMethod === "storepay" && orderId && (
              <StorepayPayment
                amount={grandTotal}
                orderId={orderId}
                type="ORDER"
                description={`Захиалга #${orderId.slice(0, 8)}`}
                onSuccess={handleStorepaySuccess}
                onCancel={handleStorepayCancel}
              />
            )}

            {/* QPay Payment Flow */}
            {paymentMethod === "qpay" && orderId && (
              <QPayPayment
                orderId={orderId}
                amount={grandTotal}
                onSuccess={handleQPaySuccess}
                onCancel={handleQPayCancel}
              />
            )}

            {/* Pocket Payment Flow */}
            {paymentMethod === "pocket" && orderId && (
              <PocketPayment
                orderId={orderId}
                amount={grandTotal}
                onSuccess={handlePocketSuccess}
                onCancel={handlePocketCancel}
              />
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="md:col-span-1 mt-4 md:mt-0">
            <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-3 md:sticky md:top-20">
              <h2 className="font-bold text-foreground md:text-lg">Захиалгын мэдээлэл</h2>
              {items.map((item) => {
                const { product, quantity, selectedColor, selectedSize, selectedGiftPackage } = item;
                const key = `${product.id}__${selectedColor || ""}__${selectedSize || ""}__${selectedGiftPackage?.id || ""}`;
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
                      {selectedGiftPackage && (
                        <p className="text-[10px] text-primary font-medium">
                          🎁 {selectedGiftPackage.name}
                          {selectedGiftPackage.items.length > 0 && `: ${selectedGiftPackage.items.map(g => g.name).join(", ")}`}
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
                  <span className={`font-medium ${totalDeliveryFee > 0 ? 'text-foreground' : 'text-primary'}`}>
                    {totalDeliveryFee > 0 ? formatPrice(totalDeliveryFee) : "Үнэгүй"}
                  </span>
                </div>
                {surcharge > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {cartTotal < 50000 && hasSaleItems
                      ? "50,000₮-с доош + хямдралтай бараа"
                      : cartTotal < 50000
                        ? "50,000₮-с доош захиалга"
                        : "Хямдралтай бараа агуулсан захиалга"}
                  </p>
                )}
                {bundleFree && !productFree && (
                  <p className="text-[10px] text-primary">
                    Багцаар авсан тул хүргэлт үнэгүй.
                  </p>
                )}
                {productFree && (
                  <p className="text-[10px] text-primary">
                    Энэ бараанд хүргэлт үнэгүй.
                  </p>
                )}
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

              {/* Action button */}
              {paymentMethod === "cash" && (
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base rounded-xl mt-2 gap-2"
                  disabled={submitting}
                  onClick={handleCashOrder}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {submitting ? "Илгээж байна..." : `Захиалга өгөх — ${formatPrice(grandTotal)}`}
                </Button>
              )}

              {paymentMethod === "storepay" && !orderId && (
                <Button
                  className="w-full h-12 text-base rounded-xl mt-2 gap-2 bg-[#00B140] hover:bg-[#009930] text-white"
                  disabled={submitting}
                  onClick={handleStorepayStart}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {submitting ? "Үүсгэж байна..." : `Storepay-ээр төлөх — ${formatPrice(grandTotal)}`}
                </Button>
              )}

              {paymentMethod === "qpay" && !orderId && (
                <Button
                  className="w-full h-12 text-base rounded-xl mt-2 gap-2"
                  disabled={submitting}
                  onClick={handleQPayStart}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  {submitting ? "Үүсгэж байна..." : `QPay-ээр төлөх — ${formatPrice(grandTotal)}`}
                </Button>
              )}

              {paymentMethod === "pocket" && !orderId && (
                <Button
                  className="w-full h-12 text-base rounded-xl mt-2 gap-2 bg-[#6C3FC5] hover:bg-[#5A32A8] text-white"
                  disabled={submitting}
                  onClick={handlePocketStart}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  {submitting ? "Үүсгэж байна..." : `Pocket-ээр төлөх — ${formatPrice(grandTotal)}`}
                </Button>
              )}

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
