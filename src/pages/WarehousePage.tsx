import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { printOrder, printOrders } from "@/lib/printOrder";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Package,
  Search,
  ClipboardList,
  History,
  Minus,
  Plus,
  CheckCircle2,
  ArrowLeft,
  PackageCheck,
  LayoutDashboard,
  AlertTriangle,
  TrendingDown,
  Zap,
  Power,
  Printer,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Tab = "dashboard" | "orders" | "pick" | "history";
const LOW_STOCK_THRESHOLD = 5;
const AUTO_PICK_STORAGE_KEY = "warehouse_auto_pick_settings";
const AUTO_PICK_PROCESSED_KEY = "warehouse_auto_pick_processed";

interface AutoPickSettings {
  enabled: boolean;
  delayMinutes: number;
}

const DEFAULT_AUTO_PICK: AutoPickSettings = { enabled: false, delayMinutes: 30 };

interface Product {
  id: string;
  name: string;
  product_code: string | null;
  price: number;
  stock_quantity: number;
  thumbnail_url: string | null;
  image_url: string | null;
  category: string;
  is_active: boolean;
}

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
  payment_method?: string | null;
  payment_status?: string | null;
  delivery_fee?: number | null;
  source_note?: string | null;
}

interface Movement {
  id: string;
  product_id: string;
  quantity: number;
  reason: string;
  order_id: string | null;
  note: string | null;
  performed_by_email: string | null;
  created_at: string;
  product?: { name: string; product_code: string | null } | null;
}

const formatPrice = (n: number) => `${(n ?? 0).toLocaleString("mn-MN")}₮`;

export default function WarehousePage() {
  const navigate = useNavigate();
  const { user, isAdmin, isModerator, loading: authLoading } = useAuth();
  const hasAccess = isAdmin || isModerator;

  const [tab, setTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual pick state
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [pickNote, setPickNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Per-order processing state
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Auto pick&pack settings — persisted in localStorage
  const sanitizeAutoPick = (val: unknown): AutoPickSettings => {
    const obj = (val ?? {}) as Partial<AutoPickSettings>;
    const delay = Number(obj.delayMinutes);
    return {
      enabled: Boolean(obj.enabled),
      delayMinutes: Number.isFinite(delay) && delay >= 1 ? Math.floor(delay) : DEFAULT_AUTO_PICK.delayMinutes,
    };
  };
  const readStoredAutoPick = (): AutoPickSettings => {
    if (typeof window === "undefined") return DEFAULT_AUTO_PICK;
    try {
      const raw = localStorage.getItem(AUTO_PICK_STORAGE_KEY);
      if (!raw) return DEFAULT_AUTO_PICK;
      return sanitizeAutoPick(JSON.parse(raw));
    } catch {
      return DEFAULT_AUTO_PICK;
    }
  };
  const [autoPick, setAutoPickState] = useState<AutoPickSettings>(readStoredAutoPick);
  const [autoRunning, setAutoRunning] = useState(false);
  const [lastAutoRun, setLastAutoRun] = useState<Date | null>(null);

  const setAutoPick = (
    updater: AutoPickSettings | ((prev: AutoPickSettings) => AutoPickSettings),
  ) => {
    setAutoPickState((prev) => {
      const next = sanitizeAutoPick(
        typeof updater === "function" ? (updater as (p: AutoPickSettings) => AutoPickSettings)(prev) : updater,
      );
      try {
        localStorage.setItem(AUTO_PICK_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Sync settings across browser tabs / windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTO_PICK_STORAGE_KEY) return;
      try {
        const next = e.newValue ? sanitizeAutoPick(JSON.parse(e.newValue)) : DEFAULT_AUTO_PICK;
        setAutoPickState(next);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const loadAll = async () => {
    setLoading(true);
    const [pRes, oRes, mRes] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,product_code,price,stock_quantity,thumbnail_url,image_url,category,is_active")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("orders")
        .select("id,order_ref,guest_name,phone,shipping_address,status,total,items,created_at,payment_method,payment_status,delivery_fee,source_note")
        .eq("status", "preparing")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (pRes.data) setProducts(pRes.data as Product[]);
    if (oRes.data) setOrders(oRes.data as any);
    if (mRes.data) {
      // Hydrate product names for movements
      const ids = Array.from(new Set((mRes.data as any[]).map((m) => m.product_id)));
      let prodMap: Record<string, { name: string; product_code: string | null }> = {};
      if (ids.length) {
        const { data: pd } = await supabase
          .from("products")
          .select("id,name,product_code")
          .in("id", ids);
        prodMap = Object.fromEntries((pd ?? []).map((p: any) => [p.id, p]));
      }
      setMovements(
        (mRes.data as any[]).map((m) => ({ ...m, product: prodMap[m.product_id] ?? null })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (hasAccess) loadAll();
  }, [hasAccess]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.product_code ?? "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [products, search]);

  const adjustPick = (productId: string, delta: number) => {
    setPicked((prev) => {
      const next = { ...prev };
      const cur = next[productId] ?? 0;
      const v = Math.max(0, cur + delta);
      if (v === 0) delete next[productId];
      else next[productId] = v;
      return next;
    });
  };

  const setPickQty = (productId: string, value: string) => {
    const n = Math.max(0, parseInt(value || "0", 10) || 0);
    setPicked((prev) => {
      const next = { ...prev };
      if (n === 0) delete next[productId];
      else next[productId] = n;
      return next;
    });
  };

  const totalPickedItems = Object.values(picked).reduce((a, b) => a + b, 0);

  const submitManualPick = async () => {
    if (!user) return;
    const entries = Object.entries(picked);
    if (entries.length === 0) {
      toast.error("Бараа сонгоно уу");
      return;
    }
    setSubmitting(true);
    const rows = entries.map(([product_id, quantity]) => ({
      product_id,
      quantity,
      reason: "manual",
      note: pickNote || null,
      performed_by: user.id,
      performed_by_email: user.email ?? null,
    }));
    const { error } = await supabase.from("stock_movements").insert(rows);
    setSubmitting(false);
    if (error) {
      toast.error("Алдаа: " + error.message);
      return;
    }
    toast.success(`${rows.length} бараа агуулахаас гаргалаа ✓`);
    setPicked({});
    setPickNote("");
    loadAll();
  };

  // Core: deduct stock for one order and mark it ready. Returns true on success.
  const processOrderStockOut = async (
    order: Order,
    opts: { auto?: boolean } = {},
  ): Promise<boolean> => {
    if (!user) return false;
    const items = Array.isArray(order.items) ? order.items : [];
    const rows = items
      .filter((it: any) => it?.product_id && it?.quantity)
      .map((it: any) => ({
        product_id: it.product_id as string,
        quantity: Number(it.quantity) || 1,
        reason: opts.auto ? "auto_pick" : "order_pick",
        order_id: order.id,
        note: opts.auto
          ? `[AUTO] ${order.order_ref ?? ""}`.trim()
          : order.order_ref ?? null,
        performed_by: user.id,
        performed_by_email: user.email ?? null,
      }));

    if (rows.length === 0) return false;

    const { error: mvErr } = await supabase.from("stock_movements").insert(rows);
    if (mvErr) {
      if (!opts.auto) toast.error("Алдаа: " + mvErr.message);
      console.error("stock_movements insert error", mvErr);
      return false;
    }

    // Move order to "ready" (бэлдэж дууссан)
    await supabase.from("orders").update({ status: "ready" }).eq("id", order.id);
    return true;
  };

  // Rollback: статусыг буцааж, үлдэгдлийг сэргээх (reverse stock movement)
  const rollbackOrderStockOut = async (order: Order, previousStatus = "preparing") => {
    if (!user) return;
    const items = Array.isArray(order.items) ? order.items : [];
    const rows = items
      .filter((it: any) => it?.product_id && it?.quantity)
      .map((it: any) => ({
        product_id: it.product_id as string,
        // Сөрөг тоогоор reverse — apply_stock_movement trigger үлдэгдлийг буцаан нэмнэ
        quantity: -(Number(it.quantity) || 1),
        reason: "rollback_print_failed",
        order_id: order.id,
        note: `[ROLLBACK] ${order.order_ref ?? ""}`.trim(),
        performed_by: user.id,
        performed_by_email: user.email ?? null,
      }));
    if (rows.length > 0) {
      const { error } = await supabase.from("stock_movements").insert(rows);
      if (error) console.error("rollback stock_movements error", error);
    }
    await supabase.from("orders").update({ status: previousStatus }).eq("id", order.id);
  };

  const completeOrderPick = async (order: Order, shouldPrint = false) => {
    if (!user) return;
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) {
      toast.error("Захиалгад бараа байхгүй байна");
      return;
    }
    const previousStatus = order.status;
    setProcessingOrderId(order.id);
    const ok = await processOrderStockOut(order);
    if (ok) {
      if (shouldPrint) {
        let printed = false;
        try {
          printed = printOrder(order);
        } catch (e) {
          console.error("print error", e);
          printed = false;
        }
        if (printed) {
          toast.success(`${order.order_ref ?? order.id.slice(0, 6)} бэлэн боллоо ✓ Хэвлэх цонх нээгдлээ`);
        } else {
          // Rollback — хэвлэх амжилтгүй болсон тул статус болон үлдэгдлийг буцаана
          await rollbackOrderStockOut(order, previousStatus);
          toast.error("Хэвлэхэд алдаа гарлаа — статус болон үлдэгдэл буцаагдлаа");
        }
      } else {
        toast.success(`${order.order_ref ?? order.id.slice(0, 6)} бэлэн боллоо ✓`);
      }
      loadAll();
    } else {
      toast.error("Үлдэгдэл хасахад алдаа гарлаа");
    }
    setProcessingOrderId(null);
  };

  // Bulk: олон захиалгыг нэгэн зэрэг үлдэгдэл хасч A4 хэвлэх
  const completeOrdersBulk = async () => {
    if (!user || bulkSelected.size === 0) return;
    const chosen = orders.filter((o) => bulkSelected.has(o.id));
    if (chosen.length === 0) {
      toast.error("Захиалга сонгоно уу");
      return;
    }
    setBulkProcessing(true);
    let success = 0;
    let failed = 0;
    const printed: { order: Order; previousStatus: string }[] = [];
    for (const o of chosen) {
      const items = Array.isArray(o.items) ? o.items : [];
      if (items.length === 0) {
        failed++;
        continue;
      }
      const previousStatus = o.status;
      const ok = await processOrderStockOut(o);
      if (ok) {
        success++;
        printed.push({ order: o, previousStatus });
      } else {
        failed++;
      }
    }

    let printOk = false;
    if (printed.length > 0) {
      try {
        printOk = printOrders(printed.map((p) => p.order));
      } catch (e) {
        console.error("printOrders error", e);
        printOk = false;
      }
      if (!printOk) {
        // Бүх амжилттай захиалгыг rollback
        for (const p of printed) {
          await rollbackOrderStockOut(p.order, p.previousStatus);
        }
        toast.error(`Хэвлэхэд алдаа гарлаа — ${printed.length} захиалгын статус болон үлдэгдэл буцаагдлаа`);
        success = 0;
      }
    }

    setBulkProcessing(false);
    setBulkSelected(new Set());
    if (success > 0) toast.success(`${success} захиалга бэлэн боллоо ✓`);
    if (failed > 0) toast.error(`${failed} захиалга боловсруулагдсангүй`);
    loadAll();
  };

  // Runs every 30s while the page is open. For each eligible order whose
  // age (since created_at) >= delayMinutes, auto-deduct stock and mark ready.
  useEffect(() => {
    if (!autoPick.enabled || !hasAccess || !user) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || autoRunning) return;

      const cutoff = Date.now() - autoPick.delayMinutes * 60_000;
      // Eligible: only "preparing" AND old enough
      const eligible = orders.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return (
          o.status === "preparing" &&
          t <= cutoff &&
          Array.isArray(o.items) &&
          o.items.length > 0
        );
      });

      if (eligible.length === 0) return;

      setAutoRunning(true);
      let successCount = 0;
      for (const o of eligible) {
        const ok = await processOrderStockOut(o, { auto: true });
        if (ok) successCount++;
      }
      setAutoRunning(false);
      setLastAutoRun(new Date());

      if (successCount > 0) {
        toast.success(`Авто горим: ${successCount} захиалга бэлэн боллоо ✓`);
        loadAll();
      }
    };

    // Run once immediately, then every 30s
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPick.enabled, autoPick.delayMinutes, orders, hasAccess, user]);


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 bg-background text-center">
        <Package className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Хандах эрхгүй</h1>
        <p className="text-muted-foreground text-sm">
          Энэ хуудсыг нярав эсвэл админ эрхтэй хэрэглэгч ашиглана.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">
          Нүүр хуудас руу
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 rounded-md hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-semibold truncate flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Агуулах · Нярав
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Шинэчлэх"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto border-t border-border">
          {[
            { id: "dashboard" as Tab, label: "Хяналтын самбар", icon: LayoutDashboard },
            { id: "orders" as Tab, label: "Захиалга бэлдэх", icon: ClipboardList, count: orders.length },
            { id: "pick" as Tab, label: "Бараа гаргах", icon: PackageCheck },
            { id: "history" as Tab, label: "Түүх", icon: History },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
                tab === t.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {t.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Auto Pick & Pack control */}
        <div
          className={`rounded-lg border p-3 md:p-4 transition ${
            autoPick.enabled
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-start md:items-center gap-3 flex-col md:flex-row md:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                  autoPick.enabled
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {autoPick.enabled ? (
                  <Zap className="h-5 w-5" />
                ) : (
                  <Power className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2">
                  Авто Pick & Pack
                  {autoRunning && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {autoPick.enabled ? (
                    <>
                      Захиалга үүссэнээс хойш{" "}
                      <span className="font-semibold text-foreground">
                        {autoPick.delayMinutes} минут
                      </span>{" "}
                      өнгөрвөл автоматаар үлдэгдэл хасч "бэлэн" болгоно.
                      {lastAutoRun && (
                        <>
                          {" · Сүүлд: "}
                          {lastAutoRun.toLocaleTimeString("mn-MN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </>
                      )}
                    </>
                  ) : (
                    "Унтраалттай — захиалгыг гараар бэлдэнэ."
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-delay" className="text-xs whitespace-nowrap">
                  Хүлээх (мин)
                </Label>
                <Input
                  id="auto-delay"
                  type="number"
                  min={1}
                  max={1440}
                  value={autoPick.delayMinutes}
                  onChange={(e) =>
                    setAutoPick((s) => ({
                      ...s,
                      delayMinutes: Math.max(1, parseInt(e.target.value || "1", 10) || 1),
                    }))
                  }
                  className="h-8 w-20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoPick.enabled}
                  onCheckedChange={(v) =>
                    setAutoPick((s) => ({ ...s, enabled: v }))
                  }
                />
                <span className="text-sm font-medium">
                  {autoPick.enabled ? "Идэвхтэй" : "Унтраалттай"}
                </span>
              </div>
            </div>
          </div>
          {autoPick.enabled && (
            <p className="text-[11px] text-muted-foreground mt-2 md:mt-3 leading-relaxed">
              ⚠️ Авто горим зөвхөн энэ хуудас нээлттэй үед ажиллана. 30 секунд тутамд шалгана.
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}


        {/* DASHBOARD TAB */}
        {tab === "dashboard" && !loading && (() => {
          const todayStr = new Date().toDateString();
          const todayMv = movements.filter(
            (m) => new Date(m.created_at).toDateString() === todayStr,
          );
          const todayUnits = todayMv.reduce((a, m) => a + (m.quantity || 0), 0);
          const lowStock = products
            .filter((p) => p.stock_quantity <= LOW_STOCK_THRESHOLD)
            .sort((a, b) => a.stock_quantity - b.stock_quantity)
            .slice(0, 20);
          const outOfStock = products.filter((p) => p.stock_quantity === 0).length;
          const pendingItems = orders.reduce((acc, o) => {
            const its = Array.isArray(o.items) ? o.items : [];
            return acc + its.reduce((s: number, it: any) => s + (Number(it.quantity) || 1), 0);
          }, 0);

          return (
            <div className="space-y-4">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setTab("orders")}
                  className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary transition"
                >
                  <div className="flex items-center justify-between">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <span className="text-xs text-muted-foreground">Pick & Pack</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{orders.length}</div>
                  <div className="text-xs text-muted-foreground">
                    захиалга · {pendingItems} ширхэг
                  </div>
                </button>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <TrendingDown className="h-5 w-5 text-primary" />
                    <span className="text-xs text-muted-foreground">Өнөөдөр гарсан</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{todayUnits}</div>
                  <div className="text-xs text-muted-foreground">
                    {todayMv.length} бичилт
                  </div>
                </div>

                <button
                  onClick={() => setTab("history")}
                  className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary transition"
                >
                  <div className="flex items-center justify-between">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Түүх</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{movements.length}</div>
                  <div className="text-xs text-muted-foreground">сүүлийн бичилт</div>
                </button>
              </div>

              {/* Pick & pack queue preview */}
              <section className="rounded-lg border border-border bg-card">
                <header className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Бэлдэх дараалал
                  </h2>
                  <button
                    onClick={() => setTab("orders")}
                    className="text-xs text-primary hover:underline"
                  >
                    Бүгдийг үзэх →
                  </button>
                </header>
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Бэлдэх захиалга алга
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {orders.slice(0, 5).map((o) => {
                      const its = Array.isArray(o.items) ? o.items : [];
                      const units = its.reduce(
                        (s: number, it: any) => s + (Number(it.quantity) || 1),
                        0,
                      );
                      return (
                        <li
                          key={o.id}
                          className="px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-sm font-semibold">
                              {o.order_ref ?? o.id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {o.guest_name ?? "—"} · {its.length} бараа · {units} ширхэг
                            </div>
                          </div>
                          <Badge
                            variant={o.status === "preparing" ? "default" : "secondary"}
                            className="shrink-0"
                          >
                            {o.status}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Low stock alerts hidden per request */}

              {/* Today's stock-out log */}
              <section className="rounded-lg border border-border bg-card">
                <header className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <History className="h-4 w-4" /> Өнөөдрийн бараа гаргалт
                  </h2>
                  <button
                    onClick={() => setTab("history")}
                    className="text-xs text-primary hover:underline"
                  >
                    Бүх түүх →
                  </button>
                </header>
                {todayMv.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Өнөөдөр бараа гаргаагүй байна
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {todayMv.slice(0, 10).map((m) => (
                      <li
                        key={m.id}
                        className="px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {m.product?.name ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleTimeString("mn-MN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {m.performed_by_email ?? "—"} ·{" "}
                            {m.reason === "order_pick"
                              ? "Захиалга"
                              : m.reason === "auto_pick"
                              ? "Авто"
                              : "Гараар"}
                          </div>
                        </div>
                        <div className="font-mono font-semibold text-destructive shrink-0">
                          −{m.quantity}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          );
        })()}

        {/* ORDERS TAB */}
        {tab === "orders" && !loading && (
          <div className="space-y-3">
            {orders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Бэлдэх захиалга алга
              </div>
            )}

            {orders.length > 0 && (
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border border-border rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="bulk-all"
                    checked={bulkSelected.size === orders.length && orders.length > 0 ? true : bulkSelected.size > 0 ? "indeterminate" : false}
                    onCheckedChange={() => {
                      setBulkSelected((prev) =>
                        prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))
                      );
                    }}
                  />
                  <label htmlFor="bulk-all" className="text-sm font-medium cursor-pointer">
                    Бүгдийг сонгох
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {bulkSelected.size} / {orders.length}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={completeOrdersBulk}
                  disabled={bulkSelected.size === 0 || bulkProcessing}
                >
                  {bulkProcessing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Боловсруулж байна...</>
                  ) : (
                    <><Printer className="h-4 w-4 mr-2" />Хүргэлтэнд гарлаа — A4 хэвлэх ({bulkSelected.size})</>
                  )}
                </Button>
              </div>
            )}

            {orders.map((o) => {
              const items = Array.isArray(o.items) ? o.items : [];
              const isChecked = bulkSelected.has(o.id);
              return (
                <div key={o.id} className={`rounded-lg border bg-card p-4 transition-colors ${isChecked ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => {
                        setBulkSelected((prev) => {
                          const next = new Set(prev);
                          next.has(o.id) ? next.delete(o.id) : next.add(o.id);
                          return next;
                        });
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold">
                        {o.order_ref ?? o.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.guest_name ?? "—"} · {o.phone ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {o.shipping_address ?? ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={o.status === "preparing" ? "default" : "secondary"}>
                        {o.status}
                      </Badge>
                      <div className="text-sm font-semibold mt-1">{formatPrice(o.total)}</div>
                    </div>
                    </div>
                  </div>

                  <ul className="text-sm space-y-1 mb-3 border-t border-border pt-2">
                    {items.map((it: any, i: number) => {
                      const prod = products.find((p) => p.id === it.product_id);
                      return (
                        <li key={i} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {it.name ?? prod?.name ?? "—"}
                            {it.size && <span className="text-muted-foreground"> · {it.size}</span>}
                            {it.color && <span className="text-muted-foreground"> · {it.color}</span>}
                          </span>
                          <span className="font-mono shrink-0">
                            ×{it.quantity ?? 1}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                   <div className="flex gap-2">
                     <Button
                       size="sm"
                       className="flex-1"
                       onClick={() => completeOrderPick(o, true)}
                       disabled={processingOrderId === o.id}
                     >
                       {processingOrderId === o.id ? (
                         <>
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                           Боловсруулж байна...
                         </>
                       ) : (
                         <>
                           <Printer className="h-4 w-4 mr-2" />
                           Хүргэлтэнд гарлаа — Хэвлэх
                         </>
                       )}
                     </Button>
                   </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PICK TAB */}
        {tab === "pick" && !loading && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Барааны нэр эсвэл SKU кодоор хайх..."
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              {filteredProducts.map((p) => {
                const qty = picked[p.id] ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
                  >
                    <div className="w-12 h-12 rounded-md bg-muted overflow-hidden shrink-0">
                      {(p.thumbnail_url || p.image_url) && (
                        <img
                          src={p.thumbnail_url || p.image_url || ""}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        {p.product_code && <span>{p.product_code}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => adjustPick(p.id, -1)}
                        disabled={qty === 0}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        value={qty}
                        onChange={(e) => setPickQty(p.id, e.target.value)}
                        className="h-8 w-14 text-center"
                        inputMode="numeric"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => adjustPick(p.id, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Бараа олдсонгүй
                </div>
              )}
            </div>

            {totalPickedItems > 0 && (
              <div className="sticky bottom-4 rounded-xl border border-border bg-card shadow-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Сонгосон: {Object.keys(picked).length} бараа · {totalPickedItems} ширхэг
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPicked({})}
                  >
                    Цуцлах
                  </Button>
                </div>
                <Textarea
                  value={pickNote}
                  onChange={(e) => setPickNote(e.target.value)}
                  placeholder="Тэмдэглэл (заавал биш)"
                  rows={2}
                />
                <Button onClick={submitManualPick} disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Агуулахаас гаргах
                </Button>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && !loading && (
          <div className="space-y-2">
            {movements.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Түүх алга
              </div>
            )}
            {movements.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.product?.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("mn-MN")} ·{" "}
                    {m.performed_by_email ?? "—"}
                  </div>
                  {m.note && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      {m.note}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-semibold text-destructive">
                    −{m.quantity}
                  </div>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {m.reason === "order_pick"
                      ? "Захиалга"
                      : m.reason === "auto_pick"
                      ? "Авто"
                      : "Гараар"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
