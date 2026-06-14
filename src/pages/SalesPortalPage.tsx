import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Wallet, User, Phone, Package, Calendar } from "lucide-react";

interface Sale {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  product_name: string;
  quantity: number;
  amount: number;
  note: string | null;
  sale_date: string;
  created_at: string;
}

interface OrderRow {
  id: string;
  order_ref: string | null;
  phone: string | null;
  shipping_address: string | null;
  total: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  guest_name: string | null;
  is_guest: boolean | null;
  created_at: string;
  items: any;
}

const formatMNT = (n: number) =>
  new Intl.NumberFormat("mn-MN").format(Math.round(n || 0)) + "₮";

const SalesPortalPage = () => {
  const navigate = useNavigate();
  const { user, loading, isSeller, isAdmin, signOut } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"sales" | "orders">("sales");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allowed = isSeller || isAdmin;

  const loadSales = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    const { data, error } = await supabase
      .from("seller_sales")
      .select("*")
      .eq("user_id", user.id)
      .order("sale_date", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Борлуулалт ачаалж чадсангүй");
    } else {
      setSales((data as Sale[]) || []);
    }
    setFetching(false);
  }, [user]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id,order_ref,phone,shipping_address,total,status,payment_status,payment_method,guest_name,is_guest,created_at,items")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      toast.error("Захиалга ачаалж чадсангүй");
    } else {
      setOrders((data as OrderRow[]) || []);
    }
    setOrdersLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && user && allowed) void loadSales();
  }, [loading, user, allowed, loadSales]);

  useEffect(() => {
    if (!loading && user && allowed && tab === "orders" && orders.length === 0) {
      void loadOrders();
    }
  }, [loading, user, allowed, tab, orders.length, loadOrders]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Уншиж байна...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-5">
          <Wallet className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold mb-2">Борлуулагчийн портал</h1>
        <p className="text-xs text-muted-foreground mb-5">Үргэлжлүүлэхийн тулд нэвтэрнэ үү.</p>
        <button
          onClick={() => navigate("/auth?redirect=/sellers")}
          className="bg-primary text-primary-foreground rounded-xl px-8 py-3 text-sm font-bold"
        >
          Нэвтрэх
        </button>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-bold mb-2">Хандах эрхгүй</h1>
        <p className="text-xs text-muted-foreground mb-5">
          Та борлуулагчийн эрхгүй байна. Админтай холбогдоно уу.
        </p>
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="rounded-xl px-6 py-2.5 text-sm border border-border"
        >
          Гарах
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !amount) {
      toast.error("Бараа болон үнийн дүн заавал");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("seller_sales").insert({
      user_id: user.id,
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone.trim() || null,
      product_name: productName.trim(),
      quantity: parseInt(quantity) || 1,
      amount: parseFloat(amount) || 0,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Хадгалж чадсангүй: " + error.message);
    } else {
      toast.success("Борлуулалт хадгалагдлаа");
      setCustomerName(""); setCustomerPhone(""); setProductName("");
      setQuantity("1"); setAmount(""); setNote("");
      void loadSales();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ борлуулалтыг устгах уу?")) return;
    const { error } = await supabase.from("seller_sales").delete().eq("id", id);
    if (error) toast.error("Устгаж чадсангүй");
    else {
      toast.success("Устгалаа");
      setSales((s) => s.filter((x) => x.id !== id));
    }
  };

  const total = sales.reduce((s, x) => s + Number(x.amount || 0), 0);
  const todayKey = new Date().toDateString();
  const todayTotal = sales
    .filter((x) => new Date(x.sale_date).toDateString() === todayKey)
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">Борлуулагчийн портал</h1>
            <p className="text-[11px] text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="flex items-center gap-1.5 text-xs rounded-lg border border-border px-3 py-2 hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5" /> Гарах
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Шинэ борлуулалт нэмэх
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Захиалагчийн нэр"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
              <input
                value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Утас"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <input
              value={productName} onChange={(e) => setProductName(e.target.value)}
              placeholder="Бараа / Үйлчилгээ *"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" min="1" value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Тоо ширхэг"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
              <input
                type="number" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Үнийн дүн (₮) *"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                required
              />
            </div>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Тэмдэглэл"
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none"
            />
            <button
              type="submit" disabled={submitting}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold disabled:opacity-50"
            >
              {submitting ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-[11px] text-muted-foreground">Өнөөдрийн борлуулалт</p>
              <p className="text-lg font-bold mt-1">{formatMNT(todayTotal)}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-[11px] text-muted-foreground">Нийт ({sales.length})</p>
              <p className="text-lg font-bold mt-1">{formatMNT(total)}</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-bold mb-3">Миний борлуулалтууд</h2>
          {fetching ? (
            <p className="text-xs text-muted-foreground">Уншиж байна...</p>
          ) : sales.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
              Одоогоор борлуулалт алга. Дээрх формоор нэмнэ үү.
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map((s) => (
                <div key={s.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm truncate flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.product_name} <span className="text-muted-foreground font-normal">× {s.quantity}</span>
                      </p>
                      <p className="font-bold text-sm whitespace-nowrap">{formatMNT(Number(s.amount))}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1.5">
                      {s.customer_name && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{s.customer_name}</span>
                      )}
                      {s.customer_phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.customer_phone}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.sale_date).toLocaleString("mn-MN")}
                      </span>
                    </div>
                    {s.note && <p className="text-[11px] text-muted-foreground mt-1 italic">{s.note}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Устгах"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesPortalPage;
