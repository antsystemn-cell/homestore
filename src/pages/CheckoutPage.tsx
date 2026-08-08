import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
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
import SonoPayment from "@/components/store/SonoPayment";
import { track, attachLeadContact } from "@/lib/tracking";
import { useBundleFreeDelivery } from "@/lib/bundleDelivery";
import { hasFreeDeliveryProduct } from "@/lib/freeDeliveryProducts";
import WalletCreditsSection from "@/components/store/WalletCreditsSection";
import type { WalletCredit } from "@/hooks/useWalletCredits";
import AddressSelector from "@/components/store/AddressSelector";

type PaymentMethod = "cash" | "storepay" | "qpay" | "pocket" | "sono";

const CheckoutPage = () => {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isGuestCheckout = !user && searchParams.get("guest") === "1";
  const externalOrderId = searchParams.get("orderId");

  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qpay");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [isViewingExistingOrder, setIsViewingViewingExistingOrder] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState<any>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Delivery options
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [loadingDelivery, setLoadingDelivery] = useState(true);

  // Payment provider logos from DB
  const [providerLogos, setProviderLogos] = useState<Record<string, string>>({});

  // Stacked coupons earned within the last 5 hours
  type SpinCoupon = { id: string; code: string; reward_value: number; minimum_order_amount: number | null; expires_at: string; created_at: string };
  const [availableCoupons, setAvailableCoupons] = useState<SpinCoupon[]>([]);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);

  // Wallet credit (single)
  const [walletCreditId, setWalletCreditId] = useState<string | null>(null);
  const [walletCredit, setWalletCredit] = useState<WalletCredit | null>(null);
  const [walletCreditDiscount, setWalletCreditDiscount] = useState<number>(0);

  // Loyalty points
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [usePoints, setUsePoints] = useState<boolean>(false);
  const [pointsInput, setPointsInput] = useState<number>(0);

  // Redirect unauthenticated non-guest users
  useEffect(() => {
    if (!user && !isGuestCheckout) {
      navigate("/cart");
    }
  }, [user, isGuestCheckout, navigate]);

  // Track checkout start once
  useEffect(() => {
    if (externalOrderId) {
      const fetchExisting = async () => {
        setLoadingExisting(true);
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("id", externalOrderId)
            .maybeSingle();
          
          if (error) throw error;
          if (data) {
            setExistingOrderData(data);
            setIsViewingViewingExistingOrder(true);
            setOrderId(data.id);
            setOrderRef(data.order_ref);
            setPhone(data.phone || "");
            setAddress(data.shipping_address || "");
            setPaymentMethod(data.payment_method as PaymentMethod || "qpay");
            
            // If already paid, show success
            if (data.payment_status === "paid" || data.status === "completed") {
              setOrdered(true);
            }
          }
        } catch (err) {
          console.error("Error fetching existing order:", err);
        } finally {
          setLoadingExisting(false);
        }
      };
      fetchExisting();
    }
  }, [externalOrderId]);

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

  // Fetch coupons earned within the last 5 hours (active, unused, not expired).
  // Exclude coupons that are already mirrored into wallet_credits to prevent
  // double-counting (WELCOME/REF/INV/wheel rewards are handled via wallet).
  useEffect(() => {
    if (!user) { setAvailableCoupons([]); return; }
    (async () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("spin_coupons")
        .select("id, code, reward_value, minimum_order_amount, expires_at, created_at")
        .eq("user_id", user.id)
        .eq("is_used", false)
        .is("invalidated_at", null)
        .gte("created_at", fiveHoursAgo)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false });
      const raw = (data as SpinCoupon[]) || [];
      const { data: mirrored } = await supabase
        .from("wallet_credits" as any)
        .select("source_coupon_id")
        .eq("user_id", user.id)
        .not("source_coupon_id", "is", null);
      const mirroredIds = new Set(((mirrored as any[]) || []).map((r) => r.source_coupon_id));
      // Dedupe by coupon code (safety net against duplicate rows)
      const seenCodes = new Set<string>();
      const filtered = raw.filter((c) => {
        if (mirroredIds.has(c.id)) return false;
        if (seenCodes.has(c.code)) return false;
        seenCodes.add(c.code);
        return true;
      });
      setAvailableCoupons(filtered);
      setSelectedCouponIds(filtered.map((c) => c.id));

    })();
  }, [user]);

  // Fetch loyalty points for logged-in users
  useEffect(() => {
    if (!user) { setLoyaltyPoints(0); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("loyalty_points")
        .eq("user_id", user.id)
        .maybeSingle();
      setLoyaltyPoints((data as any)?.loyalty_points ?? 0);
    })();
  }, [user]);

  const selectedDeliveryOption = deliveryOptions.find(d => d.id === selectedDelivery);
  const deliveryFee = selectedDeliveryOption?.price || 0;

  // Use cart data or existing order data
  const checkoutItems = isViewingExistingOrder && existingOrderData?.items ? existingOrderData.items.map((it: any) => ({
    product: {
      id: it.product_id,
      name: it.name,
      price: it.price,
      image: it.image || "/placeholder.svg",
    },
    quantity: it.quantity,
    selectedColor: it.color,
    selectedSize: it.size,
  })) : items;

  const checkoutSubtotal = isViewingExistingOrder ? 
    (checkoutItems.reduce((sum: number, it: any) => sum + (it.product.price * it.quantity), 0)) : 
    cartTotal;

  // Extra 8,000₮ delivery surcharge
  const hasSaleItems = checkoutItems.some((item: any) => item.product.isOnSale || (item.product.discount && item.product.discount > 0));
  const hasFlashSaleItems = checkoutItems.some((item: any) => item.product.isOnSale || item.product.isBogo || (item.product.discount && item.product.discount > 0));
  
  const { eligible: bundleFree } = useBundleFreeDelivery(checkoutSubtotal, checkoutItems.length);
  const productFree = hasFreeDeliveryProduct(checkoutItems);
  const surcharge = (bundleFree || productFree) ? 0 : ((checkoutSubtotal < 50000 || hasSaleItems) ? 8000 : 0);
  const totalDeliveryFee = isViewingExistingOrder ? (Number(existingOrderData.delivery_fee) || 0) : (deliveryFee + surcharge);

  // Discounts
  const welcomeBlocked = hasSaleItems && walletCredit?.credit_type === "welcome";
  const walletActive = !hasFlashSaleItems && !welcomeBlocked && !!walletCreditId && walletCreditDiscount > 0;
  const validSelectedCoupons = walletActive ? [] : availableCoupons.filter(
    (c) => selectedCouponIds.includes(c.id) && (!c.minimum_order_amount || checkoutSubtotal >= Number(c.minimum_order_amount))
  );
  const rawCouponDiscount = validSelectedCoupons.reduce((s, c) => s + Number(c.reward_value || 0), 0);
  const couponDiscount = isViewingExistingOrder ? 0 : Math.max(0, Math.min(rawCouponDiscount, checkoutSubtotal));

  const effectiveWalletDiscount = (hasFlashSaleItems || welcomeBlocked) ? 0 : walletCreditDiscount;

  const totalBeforePoints = isViewingExistingOrder ? 
    (Number(existingOrderData.total) || 0) : 
    Math.max(0, checkoutSubtotal + totalDeliveryFee - couponDiscount - effectiveWalletDiscount);

  const maxRedeemable = Math.max(0, Math.min(loyaltyPoints, totalBeforePoints));
  const pointsDiscount = usePoints ? Math.max(0, Math.min(pointsInput || 0, maxRedeemable)) : 0;
  const grandTotal = isViewingExistingOrder ? totalBeforePoints : Math.max(0, totalBeforePoints - pointsDiscount);

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
      if (pointsDiscount > 0) orderData.points_redeemed = pointsDiscount;
    }

    let data: { id: string; order_ref: string | null } | null = null;
    if (isGuestCheckout) {
      const { data: rpcData, error } = await supabase
        .rpc("create_guest_order", { payload: orderData })
        .single();
      if (error || !rpcData) {
        console.error("Order error:", error);
        toast.error("Захиалга өгөхөд алдаа гарлаа");
        return null;
      }
      data = { id: (rpcData as any).id, order_ref: (rpcData as any).order_ref };
    } else {
      const { data: insData, error } = await supabase
        .from("orders")
        .insert(orderData)
        .select("id, order_ref")
        .single();
      if (error || !insData) {
        console.error("Order error:", error);
        toast.error("Захиалга өгөхөд алдаа гарлаа");
        return null;
      }
      data = insData;
    }
    setOrderRef(data.order_ref);

    // Mark stacked coupons as used
    if (!isGuestCheckout && validSelectedCoupons.length > 0) {
      const ids = validSelectedCoupons.map((c) => c.id);
      await supabase
        .from("spin_coupons")
        .update({ is_used: true, used_order_id: data.id, used_at: new Date().toISOString() })
        .in("id", ids);
    }

    // Redeem selected wallet credit (single-use)
    if (!isGuestCheckout && walletCreditId && effectiveWalletDiscount > 0) {
      try {
        await supabase.rpc("redeem_wallet_credit" as any, { _credit_id: walletCreditId, _order_id: data.id });
      } catch (e) { console.error("wallet credit redeem failed", e); }
    }

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

  const handleSonoStart = async () => {
    if (!phone.trim() || !address.trim()) { toast.error("Утас, хаяг заавал бөглөнө үү"); return; }
    if (isGuestCheckout && !name.trim()) { toast.error("Нэр заавал бөглөнө үү"); return; }
    if (deliveryOptions.length > 0 && !selectedDelivery) { toast.error("Хүргэлтийн сонголт хийнэ үү"); return; }
    if (grandTotal < 10000) { toast.error("Sono-р төлөх боломжтой хамгийн бага дүн 10,000₮"); return; }
    if (!/^\d{8}$/.test(phone.trim())) { toast.error("Утасны дугаар 8 оронтой байх ёстой"); return; }

    setSubmitting(true);
    const id = await createOrder("processing", "sono");
    setSubmitting(false);
    if (id) setOrderId(id);
  };

  const handleSonoSuccess = () => {
    clearCart();
    setOrdered(true);
  };

  const handleSonoCancel = () => {
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
            {loadingExisting && (
              <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {/* Shipping form */}
            {!isViewingExistingOrder ? (
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
                <AddressSelector value={address} onChange={setAddress} />
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
            ) : (
              <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-2">
                <h2 className="font-semibold text-foreground md:text-lg">Захиалгын мэдээлэл</h2>
                <p className="text-sm text-muted-foreground">Утас: <span className="text-foreground font-medium">{phone}</span></p>
                <p className="text-sm text-muted-foreground">Хаяг: <span className="text-foreground font-medium">{address}</span></p>
              </div>
            )}

            {/* Delivery Options */}
            {!isViewingExistingOrder && !loadingDelivery && deliveryOptions.length > 0 && (
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

                {/* Sono */}
                <label
                  className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "sono"
                      ? "border-[#F25C2A] bg-[#F25C2A]/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="sono"
                    checked={paymentMethod === "sono"}
                    onChange={() => setPaymentMethod("sono")}
                    className="w-4 h-4 accent-[#F25C2A]"
                  />
                  {providerLogos["sono"] ? (
                    <img src={providerLogos["sono"]} alt="Sono" className="w-9 h-9 rounded-lg object-contain" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#F25C2A] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Sono</p>
                    <p className="text-xs text-muted-foreground">Sono апп-аар хуваан төлөх</p>
                  </div>
                </label>

              </div>
            </div>

            {/* Storepay Payment Flow */}
            {paymentMethod === "storepay" && (orderId || isViewingExistingOrder) && (
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
            {paymentMethod === "qpay" && (orderId || isViewingExistingOrder) && (
              <QPayPayment
                orderId={orderId}
                amount={grandTotal}
                onSuccess={handleQPaySuccess}
                onCancel={handleQPayCancel}
              />
            )}

            {/* Pocket Payment Flow */}
            {paymentMethod === "pocket" && (orderId || isViewingExistingOrder) && (
              <PocketPayment
                orderId={orderId}
                amount={grandTotal}
                onSuccess={handlePocketSuccess}
                onCancel={handlePocketCancel}
              />
            )}

            {/* Sono Payment Flow */}
            {paymentMethod === "sono" && (orderId || isViewingExistingOrder) && (
              <SonoPayment
                orderId={orderId}
                amount={grandTotal}
                onSuccess={handleSonoSuccess}
                onCancel={handleSonoCancel}
              />
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="md:col-span-1 mt-4 md:mt-0">
            <div className="bg-card rounded-xl p-4 md:p-6 border border-border space-y-3 md:sticky md:top-20">
              <h2 className="font-bold text-foreground md:text-lg">Захиалгын мэдээлэл</h2>
              {checkoutItems.map((item: any) => {
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
                          {selectedGiftPackage.items.length > 0 && `: ${selectedGiftPackage.items.map((g: any) => g.name).join(", ")}`}
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
                  <span className="text-foreground font-medium">{formatPrice(checkoutSubtotal)}</span>
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

                {availableCoupons.length > 0 && (
                  <div className="border-t border-border pt-2">
                    <p className="text-xs font-semibold text-foreground mb-1.5">
                      🎁 Сүүлийн 5 цагт авсан купон ({availableCoupons.length})
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-2">Олон купоныг давхарлаж ашиглаж болно</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {availableCoupons.map((c) => {
                        const minOk = !c.minimum_order_amount || checkoutSubtotal >= Number(c.minimum_order_amount);
                        const checked = selectedCouponIds.includes(c.id);
                        return (
                          <label key={c.id} className={`flex items-center gap-2 text-xs p-1.5 rounded border ${minOk ? "border-border cursor-pointer hover:bg-accent/30" : "border-border opacity-50"}`}>
                            <input
                              type="checkbox"
                              disabled={!minOk}
                              checked={checked && minOk}
                              onChange={(e) => {
                                setSelectedCouponIds((prev) =>
                                  e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                                );
                              }}
                            />
                            <span className="flex-1 truncate">
                              <span className="font-mono text-[10px] text-muted-foreground">{c.code}</span>
                              {c.minimum_order_amount ? (
                                <span className="block text-[10px] text-muted-foreground">
                                  Мин: {formatPrice(Number(c.minimum_order_amount))}
                                </span>
                              ) : null}
                            </span>
                            <span className="font-semibold text-primary">-{formatPrice(Number(c.reward_value))}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isViewingExistingOrder && (
                  <div className="border-t border-border pt-2">
                    <p className="text-xs text-muted-foreground">Захиалга баталгаажуулах хугацаа: {new Date(existingOrderData.created_at).toLocaleDateString()}</p>
                  </div>
                )}

                {!isGuestCheckout && (
                  <WalletCreditsSection
                    subtotal={checkoutSubtotal}
                    hasFlashSaleItems={hasFlashSaleItems}
                    hasSaleItems={hasSaleItems}
                    selectedCreditId={walletCreditId}
                    onSelect={(id, credit, discount) => {
                      setWalletCreditId(id);
                      setWalletCredit(credit);
                      setWalletCreditDiscount(discount);
                    }}
                  />
                )}

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Купон хямдрал</span>
                    <span className="text-primary font-semibold">-{formatPrice(couponDiscount)}</span>
                  </div>
                )}

                {effectiveWalletDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Урамшуулал</span>
                    <span className="text-primary font-semibold">-{formatPrice(effectiveWalletDiscount)}</span>
                  </div>
                )}

                {!isGuestCheckout && loyaltyPoints > 0 && (
                  <div className="border-t border-border pt-2 space-y-2">
                    <label className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <span className="flex items-center gap-1.5">
                        ✨ Оноогоо ашиглах
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (боломжтой: {loyaltyPoints.toLocaleString("mn-MN")})
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={usePoints}
                        onChange={(e) => {
                          setUsePoints(e.target.checked);
                          if (e.target.checked && !pointsInput) setPointsInput(maxRedeemable);
                          if (!e.target.checked) setPointsInput(0);
                        }}
                      />
                    </label>
                    {usePoints && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={maxRedeemable}
                          value={pointsInput}
                          onChange={(e) => setPointsInput(Math.max(0, Math.min(maxRedeemable, Number(e.target.value) || 0)))}
                          className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button
                          type="button"
                          onClick={() => setPointsInput(maxRedeemable)}
                          className="text-[10px] px-2 py-1 rounded-md bg-secondary text-foreground hover:bg-accent"
                        >
                          Бүгд
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">1 оноо = 1₮ хямдрал</p>
                  </div>
                )}

                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Оноо хямдрал</span>
                    <span className="text-primary font-semibold">-{formatPrice(pointsDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-bold text-foreground">Нийт</span>
                  <span className="font-extrabold text-foreground text-lg">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Action button */}
              {paymentMethod === "cash" && !isViewingExistingOrder && (
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base rounded-xl mt-2 gap-2"
                  disabled={submitting}
                  onClick={handleCashOrder}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {submitting ? "Илгээж байна..." : `Захиалга өгөх — ${formatPrice(grandTotal)}`}
                </Button>
              )}

              {paymentMethod === "storepay" && !(orderId || isViewingExistingOrder) && !isViewingExistingOrder && (
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

              {paymentMethod === "sono" && !orderId && (
                <Button
                  className="w-full h-12 text-base rounded-xl mt-2 gap-2 bg-[#F25C2A] hover:bg-[#D94A1C] text-white"
                  disabled={submitting}
                  onClick={handleSonoStart}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  {submitting ? "Үүсгэж байна..." : `Sono-р төлөх — ${formatPrice(grandTotal)}`}
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
