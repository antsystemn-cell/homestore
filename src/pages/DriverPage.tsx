import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  Truck,
  CheckCircle2,
  Camera,
  Navigation,
  PackageCheck,
  Clock,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
  X,
  XCircle,
  Banknote,
  Wallet,
  AlertTriangle,
} from "lucide-react";

type Tab = "available" | "active" | "delivered" | "failed";

interface Order {
  id: string;
  order_ref: string | null;
  guest_name: string | null;
  phone: string | null;
  shipping_address: string | null;
  status: string;
  total: number;
  items: any[];
  created_at: string;
  driver_id: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  delivery_proof_photo: string | null;
  delivery_signature_name: string | null;
  delivery_gps_lat: number | null;
  delivery_gps_lng: number | null;
  payment_method: string | null;
  payment_status: string | null;
  delivery_fee: number | null;
  delivery_return_reason: string | null;
  payment_collected_at: string | null;
  delivery_failed_at: string | null;
}

interface StatusEvent {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_by_email: string | null;
  note: string | null;
  created_at: string;
}

const formatPrice = (n: number) => `${(n ?? 0).toLocaleString("mn-MN")}₮`;

const STATUS_LABELS: Record<string, string> = {
  pending: "Шинэ",
  preparing: "Бэлдэж байна",
  phone_confirmed: "Утсаар баталгаажсан",
  ready: "Авах бэлэн",
  out_for_delivery: "Хүргэлтэнд",
  delivered: "Хүргэгдсэн",
  completed: "Дууссан",
  cancelled: "Цуцалсан / Буцаасан",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Бэлэн мөнгө",
  qpay: "QPay",
  storepay: "Storepay",
  pocket: "Pocket",
};

const RETURN_REASONS = [
  "Хүлээн авагч хариу өгөхгүй байна",
  "Хаяг олдсонгүй",
  "Худалдан авагч аваагүй",
  "Барааг буцаасан",
  "Худалдан авагч цуцалсан",
  "Бусад",
];

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("mn-MN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function DriverPage() {
  const navigate = useNavigate();
  const { user, isDriver, isAdmin, loading: authLoading } = useAuth();
  const hasAccess = isDriver || isAdmin;

  const [tab, setTab] = useState<Tab>("available");
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<StatusEvent[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Complete delivery modal
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [paymentCollected, setPaymentCollected] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pickupSubmitting, setPickupSubmitting] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Failed/return modal
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState<string>(RETURN_REASONS[0]);
  const [returnNote, setReturnNote] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnPhotoFile, setReturnPhotoFile] = useState<File | null>(null);
  const [returnPhotoPreview, setReturnPhotoPreview] = useState<string | null>(null);
  const returnFileInputRef = useRef<HTMLInputElement>(null);

  const handleReturnPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Зурагны хэмжээ 8MB-аас бага байх ёстой");
      return;
    }
    setReturnPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setReturnPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxUrl]);

  // Auth form state (in-page login / signup)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      toast.error("И-мэйл болон нууц үгээ оруулна уу");
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        toast.success("Тавтай морил!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/driver`,
            data: { full_name: authFullName.trim() || null },
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          // Save profile phone if provided
          if (authPhone.trim() || authFullName.trim()) {
            await supabase
              .from("profiles")
              .update({
                full_name: authFullName.trim() || null,
                phone: authPhone.trim() || null,
              })
              .eq("user_id", data.user.id);
          }
          // Auto-claim driver role
          const { error: rpcErr } = await supabase.rpc("claim_driver_role");
          if (rpcErr) console.error(rpcErr);
          toast.success("Бүртгэл амжилттай! Жолоочийн эрх идэвхжлээ.");
          // Reload so AuthContext refreshes roles
          setTimeout(() => window.location.reload(), 400);
        } else {
          toast.success("Бүртгэл үүслээ. И-мэйлээ шалгаж баталгаажуулна уу.");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Алдаа гарлаа");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleClaimDriver = async () => {
    setClaimBusy(true);
    try {
      const { error } = await supabase.rpc("claim_driver_role");
      if (error) throw error;
      toast.success("Жолоочийн эрх идэвхжлээ");
      setTimeout(() => window.location.reload(), 400);
    } catch (err: any) {
      toast.error(err?.message || "Эрх авч чадсангүй");
    } finally {
      setClaimBusy(false);
    }
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Get ready (available), and orders assigned to me in any of these states
      const myId = user?.id;
      const [readyRes, mineRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("status", "ready")
          .order("created_at", { ascending: false })
          .limit(200),
        myId
          ? supabase
              .from("orders")
              .select("*")
              .eq("driver_id", myId)
              .in("status", ["out_for_delivery", "delivered", "completed", "cancelled"])
              .order("created_at", { ascending: false })
              .limit(200)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (readyRes.error) throw readyRes.error;
      if (mineRes.error) throw mineRes.error;

      // Merge & dedupe
      const map = new Map<string, Order>();
      [...(readyRes.data || []), ...(mineRes.data || [])].forEach((o: any) => map.set(o.id, o));
      const merged = Array.from(map.values()) as Order[];
      setOrders(merged);

      const ids = merged.map((o) => o.id);
      if (ids.length) {
        const { data: hData } = await supabase
          .from("order_status_history")
          .select("*")
          .in("order_id", ids)
          .order("created_at", { ascending: true });
        setHistory((hData || []) as StatusEvent[]);
      } else setHistory([]);
    } catch (e: any) {
      console.error(e);
      toast.error("Захиалга татаж чадсангүй: " + (e.message || ""));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasAccess && user) void fetchOrders();
  }, [hasAccess, user?.id]);

  // Realtime
  useEffect(() => {
    if (!hasAccess) return;
    const channel = supabase
      .channel("driver-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        void fetchOrders(true)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasAccess]);

  const filtered = useMemo(() => {
    if (!user) return [] as Order[];
    if (tab === "available") {
      return orders.filter(
        (o) => o.status === "ready" && (!o.driver_id || o.driver_id === user.id)
      );
    }
    if (tab === "active") {
      return orders.filter(
        (o) => o.status === "out_for_delivery" && o.driver_id === user.id
      );
    }
    if (tab === "delivered") {
      return orders.filter(
        (o) =>
          (o.status === "delivered" || o.status === "completed") &&
          o.driver_id === user.id
      );
    }
    // failed: cancelled by me, or with delivery_failed_at
    return orders.filter(
      (o) => o.status === "cancelled" && o.driver_id === user.id
    );
  }, [orders, tab, user]);

  const counts = useMemo(() => {
    if (!user) return { available: 0, active: 0, delivered: 0, failed: 0 };
    return {
      available: orders.filter(
        (o) => o.status === "ready" && (!o.driver_id || o.driver_id === user.id)
      ).length,
      active: orders.filter(
        (o) => o.status === "out_for_delivery" && o.driver_id === user.id
      ).length,
      delivered: orders.filter(
        (o) =>
          (o.status === "delivered" || o.status === "completed") &&
          o.driver_id === user.id
      ).length,
      failed: orders.filter(
        (o) => o.status === "cancelled" && o.driver_id === user.id
      ).length,
    };
  }, [orders, user]);

  // Pickup from warehouse
  const handlePickup = async (order: Order) => {
    if (!user) return;
    setPickupSubmitting(order.id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          driver_id: user.id,
          assigned_at: order.assigned_at || new Date().toISOString(),
          picked_up_at: new Date().toISOString(),
          status: "out_for_delivery",
        })
        .eq("id", order.id);
      if (error) throw error;
      toast.success("Захиалга авлаа — хүргэлтэнд гарлаа");
      setTab("active");
      await fetchOrders(true);
    } catch (e: any) {
      toast.error("Алдаа: " + (e.message || ""));
    } finally {
      setPickupSubmitting(null);
    }
  };

  const openCompleteForm = (order: Order) => {
    setActiveOrderId(order.id);
    setSignatureName(order.guest_name || "");
    setPhotoFile(null);
    setPhotoPreview(null);
    // Default: if cash, need to collect; if already paid online, no need
    setPaymentCollected(order.payment_status !== "paid");
  };

  const closeCompleteForm = () => {
    setActiveOrderId(null);
    setSignatureName("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Зурагны хэмжээ 8MB-аас бага байх ёстой");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    });

  const handleComplete = async () => {
    if (!user || !activeOrderId) return;
    if (!signatureName.trim()) {
      toast.error("Хүлээн авагчийн нэр заавал хэрэгтэй");
      return;
    }
    const order = orders.find((o) => o.id === activeOrderId);
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${activeOrderId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("delivery-proofs")
          .upload(path, photoFile, { contentType: photoFile.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("delivery-proofs")
          .getPublicUrl(path);
        photoUrl = pub.publicUrl;
      }
      const gps = await getCurrentLocation();

      const update: any = {
        status: "delivered",
        delivered_at: new Date().toISOString(),
        delivery_signature_name: signatureName.trim(),
        delivery_proof_photo: photoUrl,
        delivery_gps_lat: gps?.lat ?? null,
        delivery_gps_lng: gps?.lng ?? null,
      };
      if (paymentCollected) {
        update.payment_status = "paid";
        update.payment_collected_at = new Date().toISOString();
      }

      const { error } = await supabase.from("orders").update(update).eq("id", activeOrderId);
      if (error) throw error;
      toast.success("Хүргэлт амжилттай дууслаа ✅");
      closeCompleteForm();
      setTab("delivered");
      await fetchOrders(true);
    } catch (e: any) {
      toast.error("Алдаа: " + (e.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  const openReturnModal = (order: Order) => {
    setReturnOrderId(order.id);
    setReturnReason(RETURN_REASONS[0]);
    setReturnNote("");
    setReturnPhotoFile(null);
    setReturnPhotoPreview(null);
  };
  const closeReturnModal = () => {
    setReturnOrderId(null);
    setReturnNote("");
    setReturnPhotoFile(null);
    setReturnPhotoPreview(null);
  };

  const handleReturn = async () => {
    if (!user || !returnOrderId) return;
    const reasonText = returnNote.trim()
      ? `${returnReason} — ${returnNote.trim()}`
      : returnReason;
    setReturnSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (returnPhotoFile) {
        const ext = returnPhotoFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${returnOrderId}-return-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("delivery-proofs")
          .upload(path, returnPhotoFile, {
            contentType: returnPhotoFile.type,
            upsert: false,
          });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("delivery-proofs")
          .getPublicUrl(path);
        photoUrl = pub.publicUrl;
      }

      const update: any = {
        status: "cancelled",
        delivery_failed_at: new Date().toISOString(),
        delivery_return_reason: reasonText,
      };
      if (photoUrl) update.delivery_proof_photo = photoUrl;

      const { error } = await supabase
        .from("orders")
        .update(update)
        .eq("id", returnOrderId);
      if (error) throw error;
      toast.success("Захиалгыг буцаасан/аваагүй гэж тэмдэглэлээ");
      closeReturnModal();
      setTab("failed");
      await fetchOrders(true);
    } catch (e: any) {
      toast.error("Алдаа: " + (e.message || ""));
    } finally {
      setReturnSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-center">Жолоочийн булан</h1>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-5">
            {authMode === "login"
              ? "Бүртгэлтэй и-мэйлээрээ нэвтэрнэ үү"
              : "Шинээр бүртгүүлж жолоочийн эрх авна уу"}
          </p>

          <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`py-2 text-sm rounded-md transition ${
                authMode === "login" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
              }`}
            >
              Нэвтрэх
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`py-2 text-sm rounded-md transition ${
                authMode === "signup" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
              }`}
            >
              Бүртгүүлэх
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {authMode === "signup" && (
              <>
                <div>
                  <Label className="text-xs">Овог нэр</Label>
                  <Input
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="Бат-Эрдэнэ"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label className="text-xs">Утас</Label>
                  <Input
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="9911XXXX"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs">И-мэйл</Label>
              <Input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="driver@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Нууц үг</Label>
              <Input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={authBusy}>
              {authBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {authMode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="block mx-auto mt-4 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Нүүр хуудас руу
          </button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">Жолоочийн эрх авах</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Та нэвтэрсэн боловч жолоочийн эрхгүй байна. Доорх товчийг дарж жолоочийн булан руу нэвтрэх эрх аваарай.
          </p>
          <Button onClick={handleClaimDriver} disabled={claimBusy} className="w-full">
            {claimBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Жолоочийн эрх авах
          </Button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="block mx-auto mt-4 text-xs text-muted-foreground hover:text-foreground"
          >
            Өөр хаягаар нэвтрэх
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Буцах
          </button>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h1 className="text-base font-bold">Жолоочийн самбар</h1>
          </div>
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Сэргээх"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-2">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {(
              [
                { id: "available", label: "Авах бэлэн", count: counts.available, icon: Package },
                { id: "active", label: "Хүргэлтэнд", count: counts.active, icon: Truck },
                { id: "delivered", label: "Хүргэсэн", count: counts.delivered, icon: PackageCheck },
                { id: "failed", label: "Буцаасан/Аваагүй", count: counts.failed, icon: XCircle },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">{t.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      active ? "bg-primary-foreground/20" : "bg-background"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            {tab === "available" && "Авах бэлэн захиалга алга"}
            {tab === "active" && "Хүргэлтэнд яваа захиалга алга"}
            {tab === "delivered" && "Хүргэсэн захиалга алга"}
            {tab === "failed" && "Буцаасан / аваагүй захиалга алга"}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                tab={tab}
                onPickup={handlePickup}
                onOpenComplete={openCompleteForm}
                onOpenReturn={openReturnModal}
                pickupSubmitting={pickupSubmitting === o.id}
                expanded={expandedOrderId === o.id}
                onToggleExpand={() =>
                  setExpandedOrderId((prev) => (prev === o.id ? null : o.id))
                }
                onZoom={setLightboxUrl}
              />
            ))}
          </div>
        )}
      </main>

      {/* Complete delivery modal */}
      {activeOrderId &&
        (() => {
          const o = orders.find((x) => x.id === activeOrderId);
          const isCash = (o?.payment_method || "cash") === "cash";
          const alreadyPaid = o?.payment_status === "paid";
          const amount = (o?.total ?? 0) + Number(o?.delivery_fee ?? 0);
          return (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
              <div className="bg-card border border-border rounded-t-3xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
                  <h3 className="font-bold text-sm">Хүргэлт дуусгах</h3>
                  <button
                    onClick={closeCompleteForm}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Хаах
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Payment summary */}
                  <div
                    className={`rounded-xl border p-3 ${
                      alreadyPaid
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-amber-500/30 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {alreadyPaid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Banknote className="h-4 w-4 text-amber-600" />
                        )}
                        <div>
                          <p className="text-xs font-semibold">
                            {alreadyPaid
                              ? "Төлбөр төлөгдсөн"
                              : `Төлбөр авах: ${formatPrice(amount)}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {PAYMENT_METHOD_LABELS[o?.payment_method || "cash"] ||
                              o?.payment_method}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!alreadyPaid && (
                      <label className="mt-2 flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentCollected}
                          onChange={(e) => setPaymentCollected(e.target.checked)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span>Төлбөрийг бүрэн авлаа</span>
                      </label>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">Хүлээн авагчийн нэр / гарын үсэг *</Label>
                    <Input
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="Овог нэр"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Хүлээлгэж өгсөн зураг</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    {photoPreview ? (
                      <div className="mt-1.5 relative">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-xl border border-border"
                        />
                        <button
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded-md text-xs"
                        >
                          Солих
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-1.5 w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Camera className="h-6 w-6" />
                        <span className="text-xs">Зураг авах / Сонгох</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-secondary/50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Хүргэлт дуусгахад GPS байршил автоматаар хадгалагдана.
                    </p>
                  </div>

                  <Button
                    onClick={handleComplete}
                    disabled={submitting || !signatureName.trim()}
                    className="w-full h-11"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Илгээж байна...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Хүргэлт дуусгах
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Return / failed modal */}
      {returnOrderId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-card border border-border rounded-t-3xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Буцаасан / Аваагүй
              </h3>
              <button
                onClick={closeReturnModal}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Хаах
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs">Шалтгаан *</Label>
                <div className="mt-1.5 space-y-1.5">
                  {RETURN_REASONS.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                        returnReason === r
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={returnReason === r}
                        onChange={() => setReturnReason(r)}
                        className="accent-primary"
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Нэмэлт тайлбар</Label>
                <Input
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Жишээ: Хаалга нээгээгүй"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Нотолгооны зураг (заавал биш)</Label>
                <input
                  ref={returnFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReturnPhotoSelect}
                  className="hidden"
                />
                {returnPhotoPreview ? (
                  <div className="mt-1.5 relative">
                    <img
                      src={returnPhotoPreview}
                      alt="Preview"
                      className="w-full h-44 object-cover rounded-xl border border-border"
                    />
                    <button
                      onClick={() => {
                        setReturnPhotoFile(null);
                        setReturnPhotoPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded-md text-xs"
                    >
                      Солих
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => returnFileInputRef.current?.click()}
                    className="mt-1.5 w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Зураг авах / Сонгох</span>
                  </button>
                )}
              </div>
              <Button
                onClick={handleReturn}
                disabled={returnSubmitting}
                variant="destructive"
                className="w-full h-11"
              >
                {returnSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Буцаасан/Аваагүй гэж тэмдэглэх
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxUrl(null);
            }}
            aria-label="Хаах"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Хүргэлтийн нотолгооны зураг"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function PaymentChip({ order }: { order: Order }) {
  const paid = order.payment_status === "paid";
  const method = order.payment_method || "cash";
  const isCash = method === "cash";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        paid
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : isCash
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            : "bg-sky-500/15 text-sky-700 dark:text-sky-400"
      }`}
    >
      {paid ? <CheckCircle2 className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
      {PAYMENT_METHOD_LABELS[method] || method} · {paid ? "Төлсөн" : "Төлөөгүй"}
    </span>
  );
}

function OrderCard({
  order,
  tab,
  onPickup,
  onOpenComplete,
  onOpenReturn,
  pickupSubmitting,
  expanded,
  onToggleExpand,
  onZoom,
}: {
  order: Order;
  tab: Tab;
  onPickup: (o: Order) => void;
  onOpenComplete: (o: Order) => void;
  onOpenReturn: (o: Order) => void;
  pickupSubmitting: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onZoom: (url: string) => void;
}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((s, it: any) => s + (it.quantity || 1), 0);
  const amount = (order.total ?? 0) + Number(order.delivery_fee ?? 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            #{order.order_ref || order.id.slice(0, 8)}
          </p>
          <p className="font-semibold text-sm mt-0.5 truncate">
            {order.guest_name || "Захиалагч"}
          </p>
        </div>
        <Badge
          variant={order.status === "cancelled" ? "destructive" : "secondary"}
          className="text-[10px] shrink-0"
        >
          {STATUS_LABELS[order.status] || order.status}
        </Badge>
      </div>

      {/* Payment chip + total */}
      <div className="flex items-center justify-between gap-2">
        <PaymentChip order={order} />
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Дүн</p>
          <p className="font-bold text-sm">{formatPrice(amount)}</p>
        </div>
      </div>

      {/* Contact */}
      {order.phone && (
        <a
          href={`tel:${order.phone}`}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Phone className="h-4 w-4" />
          {order.phone}
        </a>
      )}

      {order.shipping_address && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <span className="flex-1">{order.shipping_address}</span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              order.shipping_address
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline shrink-0"
          >
            Газар →
          </a>
        </div>
      )}

      {/* Items toggle */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground border-t border-border pt-3"
      >
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          {itemCount} ширхэг бараа
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && items.length > 0 && (
        <ul className="space-y-1.5 text-xs">
          {items.map((it: any, idx: number) => (
            <li
              key={idx}
              className="flex items-start justify-between gap-2 rounded-lg bg-secondary/40 px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{it.name || it.product_name || "Бараа"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {[it.color, it.size].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">×{it.quantity || 1}</p>
                {it.price != null && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatPrice(Number(it.price))}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Timestamps */}
      {(order.assigned_at || order.picked_up_at || order.delivered_at || order.delivery_failed_at) && (
        <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-border pt-2">
          {order.picked_up_at && (
            <p className="flex items-center gap-1.5">
              <Truck className="h-3 w-3" /> Авсан: {formatDateTime(order.picked_up_at)}
            </p>
          )}
          {order.delivered_at && (
            <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Хүргэсэн:{" "}
              {formatDateTime(order.delivered_at)}
            </p>
          )}
          {order.delivery_failed_at && (
            <p className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <XCircle className="h-3 w-3" /> Аваагүй: {formatDateTime(order.delivery_failed_at)}
            </p>
          )}
          {order.payment_collected_at && (
            <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Banknote className="h-3 w-3" /> Төлбөр авсан:{" "}
              {formatDateTime(order.payment_collected_at)}
            </p>
          )}
        </div>
      )}

      {/* Failed reason + evidence photo */}
      {order.status === "cancelled" && (order.delivery_return_reason || order.delivery_proof_photo) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-xs space-y-2">
          {order.delivery_return_reason && (
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400 mb-0.5 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Шалтгаан
              </p>
              <p className="text-foreground">{order.delivery_return_reason}</p>
            </div>
          )}
          {order.delivery_proof_photo && (
            <button
              type="button"
              onClick={() => onZoom(order.delivery_proof_photo!)}
              className="block w-full group"
            >
              <img
                src={order.delivery_proof_photo}
                alt="Нотолгоо"
                className="w-full h-32 object-cover rounded-lg cursor-zoom-in"
              />
            </button>
          )}
        </div>
      )}

      {/* Delivered proof */}
      {(order.status === "delivered" || order.status === "completed") && (
        <div className="space-y-2 pt-2 border-t border-border">
          {order.delivery_signature_name && (
            <p className="text-xs text-muted-foreground">
              Хүлээн авсан:{" "}
              <span className="text-foreground font-medium">
                {order.delivery_signature_name}
              </span>
            </p>
          )}
          {order.delivery_proof_photo && (
            <button
              type="button"
              onClick={() => onZoom(order.delivery_proof_photo!)}
              className="block w-full group"
            >
              <img
                src={order.delivery_proof_photo}
                alt="Хүргэлтийн нотолгоо"
                className="w-full h-32 object-cover rounded-lg cursor-zoom-in"
              />
            </button>
          )}
          {order.delivery_gps_lat && order.delivery_gps_lng && (
            <a
              href={`https://www.google.com/maps?q=${order.delivery_gps_lat},${order.delivery_gps_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Navigation className="h-3 w-3" />
              GPS байршил
            </a>
          )}
        </div>
      )}

      {/* Action buttons */}
      {tab === "available" && (
        <Button
          onClick={() => onPickup(order)}
          disabled={pickupSubmitting}
          className="w-full h-10"
          size="sm"
        >
          {pickupSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Truck className="h-4 w-4 mr-2" />
          )}
          Барааг авч явах
        </Button>
      )}

      {tab === "active" && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenReturn(order)}
            className="h-10"
            size="sm"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Аваагүй
          </Button>
          <Button onClick={() => onOpenComplete(order)} className="h-10" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Хүргэсэн
          </Button>
        </div>
      )}
    </div>
  );
}
