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
  Circle,
  X,
} from "lucide-react";

type Tab = "available" | "active" | "delivered";

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
  pending: "Шинэ захиалга",
  preparing: "Бэлдэж байна",
  phone_confirmed: "Утсаар баталгаажсан",
  ready: "Авах бэлэн",
  out_for_delivery: "Хүргэлтэнд",
  delivered: "Хүргэгдсэн",
  completed: "Дууссан",
  cancelled: "Цуцалсан",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  ready: "secondary",
  out_for_delivery: "default",
  delivered: "outline",
};

// Timeline color coding per status
const STATUS_DOT_CLS: Record<string, string> = {
  pending: "bg-slate-400",
  preparing: "bg-amber-500",
  phone_confirmed: "bg-sky-500",
  ready: "bg-blue-500",
  out_for_delivery: "bg-violet-500",
  delivered: "bg-emerald-500",
  completed: "bg-emerald-600",
  cancelled: "bg-red-500",
};

// Canonical order of pipeline steps for the visual timeline
const PIPELINE: string[] = [
  "pending",
  "preparing",
  "phone_confirmed",
  "ready",
  "out_for_delivery",
  "delivered",
];

// Index map for quick "is step before/at current?" lookups
const PIPELINE_INDEX: Record<string, number> = PIPELINE.reduce(
  (acc, s, i) => ({ ...acc, [s]: i }),
  {} as Record<string, number>
);

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("mn-MN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}с өмнө`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}м өмнө`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}ц өмнө`;
  const day = Math.floor(hr / 24);
  return `${day}ө өмнө`;
};

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

  // Per-order interaction state
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickupSubmitting, setPickupSubmitting] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close lightbox on Esc
  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxUrl]);

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      navigate("/");
    }
  }, [authLoading, hasAccess, navigate]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const ordersRes = await supabase
        .from("orders")
        .select("*")
        .in("status", ["ready", "out_for_delivery", "delivered"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (ordersRes.error) throw ordersRes.error;
      const ordersData = (ordersRes.data || []) as Order[];
      setOrders(ordersData);

      const ids = ordersData.map((o) => o.id);
      if (ids.length) {
        const { data: hData, error: hErr } = await supabase
          .from("order_status_history")
          .select("*")
          .in("order_id", ids)
          .order("created_at", { ascending: true });
        if (hErr) console.warn("history fetch", hErr);
        setHistory((hData || []) as StatusEvent[]);
      } else {
        setHistory([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Захиалга татаж чадсангүй: " + (e.message || ""));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasAccess) void fetchOrders();
  }, [hasAccess]);

  // Realtime — orders + status history
  useEffect(() => {
    if (!hasAccess) return;
    const channel = supabase
      .channel("driver-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void fetchOrders(true)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_status_history" },
        (payload) => {
          const ev = payload.new as StatusEvent;
          setHistory((prev) =>
            prev.some((e) => e.id === ev.id) ? prev : [...prev, ev]
          );
        }
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
      return orders.filter((o) => o.status === "out_for_delivery" && o.driver_id === user.id);
    }
    return orders.filter((o) => o.status === "delivered" && o.driver_id === user.id);
  }, [orders, tab, user]);

  // 1. Driver picks up an order from warehouse
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
      console.error(e);
      toast.error("Алдаа гарлаа: " + (e.message || ""));
    } finally {
      setPickupSubmitting(null);
    }
  };

  // Open delivery completion form
  const openCompleteForm = (order: Order) => {
    setActiveOrderId(order.id);
    setSignatureName(order.guest_name || "");
    setPhotoFile(null);
    setPhotoPreview(null);
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

  const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    });
  };

  // 2. Driver completes delivery — uploads photo, captures GPS, name
  const handleComplete = async () => {
    if (!user || !activeOrderId) return;
    if (!signatureName.trim()) {
      toast.error("Хүлээн авагчийн нэр заавал хэрэгтэй");
      return;
    }

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
        const { data: pub } = supabase.storage.from("delivery-proofs").getPublicUrl(path);
        photoUrl = pub.publicUrl;
      }

      const gps = await getCurrentLocation();

      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
          delivery_signature_name: signatureName.trim(),
          delivery_proof_photo: photoUrl,
          delivery_gps_lat: gps?.lat ?? null,
          delivery_gps_lng: gps?.lng ?? null,
        })
        .eq("id", activeOrderId);

      if (error) throw error;
      toast.success("Хүргэлт амжилттай дууслаа ✅");
      closeCompleteForm();
      setTab("delivered");
      await fetchOrders(true);
    } catch (e: any) {
      console.error(e);
      toast.error("Алдаа гарлаа: " + (e.message || ""));
    } finally {
      setSubmitting(false);
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
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted-foreground mb-4">Та эхлээд нэвтэрнэ үү</p>
          <Button onClick={() => navigate("/auth")}>Нэвтрэх</Button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Танд хүргэлтийн хандах эрх алга байна.</p>
      </div>
    );
  }

  const counts = {
    available: orders.filter((o) => o.status === "ready" && (!o.driver_id || o.driver_id === user.id)).length,
    active: orders.filter((o) => o.status === "out_for_delivery" && o.driver_id === user.id).length,
    delivered: orders.filter((o) => o.status === "delivered" && o.driver_id === user.id).length,
  };

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
            <h1 className="text-base font-bold">Хүргэлт</h1>
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
            {([
              { id: "available", label: "Авах бэлэн", count: counts.available, icon: Package },
              { id: "active", label: "Хүргэлтэнд", count: counts.active, icon: Truck },
              { id: "delivered", label: "Хүргэсэн", count: counts.delivered, icon: PackageCheck },
            ] as const).map((t) => {
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
                  <span>{t.label}</span>
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
                pickupSubmitting={pickupSubmitting === o.id}
                events={history.filter((h) => h.order_id === o.id)}
                expanded={expandedOrderId === o.id}
                onToggleTimeline={() =>
                  setExpandedOrderId((prev) => (prev === o.id ? null : o.id))
                }
              />
            ))}
          </div>
        )}
      </main>

      {/* Complete delivery modal */}
      {activeOrderId && (
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
      )}
    </div>
  );
}

function OrderCard({
  order,
  tab,
  onPickup,
  onOpenComplete,
  pickupSubmitting,
  events,
  expanded,
  onToggleTimeline,
}: {
  order: Order;
  tab: Tab;
  onPickup: (o: Order) => void;
  onOpenComplete: (o: Order) => void;
  pickupSubmitting: boolean;
  events: StatusEvent[];
  expanded: boolean;
  onToggleTimeline: () => void;
}) {
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((s, it: any) => s + (it.quantity || 1), 0)
    : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">#{order.order_ref || order.id.slice(0, 8)}</p>
          <p className="font-semibold text-sm mt-0.5">{order.guest_name || "Захиалагч"}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[order.status] || "secondary"} className="text-[10px]">
          {STATUS_LABELS[order.status] || order.status}
        </Badge>
      </div>

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
            Газрын зураг →
          </a>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <span className="flex items-center gap-1">
          <Package className="h-3.5 w-3.5" />
          {itemCount} ширхэг
        </span>
        <span className="font-bold text-foreground">{formatPrice(order.total)}</span>
      </div>

      {tab === "delivered" && (
        <div className="space-y-2 pt-2 border-t border-border">
          {order.delivery_signature_name && (
            <p className="text-xs text-muted-foreground">
              Хүлээн авсан: <span className="text-foreground">{order.delivery_signature_name}</span>
            </p>
          )}
          {order.delivered_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(order.delivered_at).toLocaleString("mn-MN")}
            </p>
          )}
          {order.delivery_proof_photo && (
            <img
              src={order.delivery_proof_photo}
              alt="Хүргэлтийн нотолгоо"
              className="w-full h-32 object-cover rounded-lg"
            />
          )}
          {order.delivery_gps_lat && order.delivery_gps_lng && (
            <a
              href={`https://www.google.com/maps?q=${order.delivery_gps_lat},${order.delivery_gps_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Navigation className="h-3 w-3" />
              GPS байршил харах
            </a>
          )}
        </div>
      )}

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
          Авч явах
        </Button>
      )}

      {tab === "active" && (
        <Button
          onClick={() => onOpenComplete(order)}
          className="w-full h-10"
          size="sm"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Хүргэлт дуусгах
        </Button>
      )}

      {/* Timeline toggle */}
      <button
        onClick={onToggleTimeline}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground border-t border-border pt-3 -mb-1"
      >
        <span className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          Хөдөлгөөний түүх
          <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">{events.length}</span>
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && <Timeline events={events} currentStatus={order.status} order={order} />}
    </div>
  );
}

function Timeline({ events, currentStatus, order }: { events: StatusEvent[]; currentStatus: string; order: Order }) {
  // Sort events ascending by time
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Determine which pipeline steps were reached.
  // 1) Any status that ever appeared in history (from_status or to_status).
  // 2) Current status itself.
  // 3) All earlier PIPELINE steps before the highest reached index — so the
  //    bar stays continuous even when intermediate transitions are missing.
  const reachedSteps = new Set<string>();
  sorted.forEach((e) => {
    if (e.from_status) reachedSteps.add(e.from_status);
    reachedSteps.add(e.to_status);
  });
  reachedSteps.add(currentStatus);

  let maxIdx = -1;
  reachedSteps.forEach((s) => {
    const i = PIPELINE_INDEX[s];
    if (i !== undefined && i > maxIdx) maxIdx = i;
  });
  if (maxIdx >= 0) {
    for (let i = 0; i <= maxIdx; i++) reachedSteps.add(PIPELINE[i]);
  }

  // Map: status -> latest event for it (for actor info & timestamp)
  const latestByStatus: Record<string, StatusEvent> = {};
  sorted.forEach((e) => {
    latestByStatus[e.to_status] = e;
  });

  // Off-pipeline terminal states (completed / cancelled) — show a trailing chip
  const offPipelineCurrent =
    PIPELINE_INDEX[currentStatus] === undefined ? currentStatus : null;

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic pt-2">Түүх байхгүй</p>
    );
  }

  return (
    <div className="pt-3 space-y-3">
      {/* Pipeline progress strip */}
      <div className="flex items-center gap-1">
        {PIPELINE.map((step, idx) => {
          const reached = reachedSteps.has(step);
          const isCurrent = step === currentStatus;
          return (
            <div key={step} className="flex-1 flex items-center gap-1">
              <div
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  reached ? STATUS_DOT_CLS[step] || "bg-primary" : "bg-secondary"
                } ${isCurrent ? "ring-2 ring-offset-1 ring-offset-card ring-primary/40" : ""}`}
                title={STATUS_LABELS[step] || step}
              />
              {idx < PIPELINE.length - 1 && (
                <div className="h-1 w-1 rounded-full bg-border shrink-0" />
              )}
            </div>
          );
        })}
        {offPipelineCurrent && (
          <div
            className={`ml-1 h-1.5 px-2 rounded-full ring-2 ring-offset-1 ring-offset-card ring-primary/40 ${
              STATUS_DOT_CLS[offPipelineCurrent] || "bg-primary"
            }`}
            title={STATUS_LABELS[offPipelineCurrent] || offPipelineCurrent}
          />
        )}
      </div>

      {/* Detailed event list (newest first) */}
      <ol className="relative space-y-2.5 pl-5">
        <span className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
        {[...sorted].reverse().map((e, idx) => {
          const dotCls = STATUS_DOT_CLS[e.to_status] || "bg-primary";
          const isLatest = idx === 0;
          const actor = e.changed_by_email || (e.changed_by ? "Систем" : "Автомат");
          return (
            <li key={e.id} className="relative">
              <span
                className={`absolute -left-5 top-1 h-3 w-3 rounded-full ${dotCls} ${
                  isLatest ? "ring-2 ring-offset-1 ring-offset-card ring-primary/40" : ""
                }`}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {e.from_status ? (
                      <>
                        <span className="text-muted-foreground">{STATUS_LABELS[e.from_status] || e.from_status}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Үүссэн → </span>
                    )}
                    <span>{STATUS_LABELS[e.to_status] || e.to_status}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate" title={actor}>
                    {actor}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">{relativeTime(e.created_at)}</p>
                  <p className="text-[10px] text-muted-foreground/70">{formatDateTime(e.created_at)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Delivery proof block — only for delivered orders */}
      {currentStatus === "delivered" && (
        <div className="mt-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Хүргэлтийн нотолгоо
          </div>

          {order.delivery_proof_photo ? (
            <a
              href={order.delivery_proof_photo}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={order.delivery_proof_photo}
                alt="Хүргэлтийн нотолгоо"
                loading="lazy"
                className="w-full max-h-56 object-cover rounded-lg border border-border"
              />
            </a>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">Зураг ороогүй</p>
          )}

          <div className="grid grid-cols-1 gap-1.5 text-xs">
            {order.delivery_signature_name && (
              <div className="flex items-start gap-1.5">
                <span className="text-muted-foreground shrink-0">Хүлээн авсан:</span>
                <span className="font-medium text-foreground">{order.delivery_signature_name}</span>
              </div>
            )}
            {order.delivered_at && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{new Date(order.delivered_at).toLocaleString("mn-MN")}</span>
              </div>
            )}
            {order.delivery_gps_lat != null && order.delivery_gps_lng != null ? (
              <a
                href={`https://www.google.com/maps?q=${order.delivery_gps_lat},${order.delivery_gps_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Navigation className="h-3 w-3" />
                <span className="font-mono text-[11px]">
                  {order.delivery_gps_lat.toFixed(5)}, {order.delivery_gps_lng.toFixed(5)}
                </span>
                <span className="text-[10px]">— газрын зураг харах</span>
              </a>
            ) : (
              <p className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                <Navigation className="h-3 w-3" />
                GPS байршил байхгүй
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
