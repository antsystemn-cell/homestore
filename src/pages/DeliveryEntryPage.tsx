import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut, Store, Search, ChevronLeft, Save, Loader2 } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string | null;
}

interface OrderLite {
  id: string;
  order_ref: string | null;
  created_at: string;
  status: string;
  total: number;
  phone: string | null;
  shipping_address: string | null;
  branch: string | null;
  guest_name: string | null;
  source_note: string | null;
  items: any;
}

const DeliveryEntryPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderLite | null>(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Auth + role + branch gate
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth?redirect=/delivery-entry");
      return;
    }
    (async () => {
      const [roleRes, branchRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.rpc("current_user_branch" as any),
      ]);
      const roles = (roleRes.data || []).map((r: any) => r.role);
      const ok = roles.includes("delivery_entry") || roles.includes("admin");
      setAllowed(ok);
      if (!ok) return;
      const b = (branchRes.data as any)?.[0] ?? null;
      setBranch(b);
    })();
  }, [user, authLoading, navigate]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_ref, created_at, status, total, phone, shipping_address, branch, guest_name, source_note, items")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) toast.error("Захиалга ачаалахад алдаа гарлаа");
    setOrders((data as any) || []);
    setLoadingOrders(false);
  };

  useEffect(() => {
    if (allowed && branch) loadOrders();
  }, [allowed, branch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.order_ref || "").toLowerCase().includes(q) ||
      (o.phone || "").toLowerCase().includes(q) ||
      (o.guest_name || "").toLowerCase().includes(q) ||
      (o.shipping_address || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const openOrder = (o: OrderLite) => {
    setSelected(o);
    setPhone(o.phone || "");
    setAddress(o.shipping_address || "");
    setNote(o.source_note || "");
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("delivery_entry_submit" as any, {
      _order_id: selected.id,
      _phone: phone,
      _shipping_address: address,
      _note: note,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Хадгалахад алдаа гарлаа");
      return;
    }
    toast.success("Хүргэлтийн мэдээлэл хадгалагдлаа");
    setOrders((prev) => prev.map((o) => (o.id === selected.id ? { ...o, ...(data as any) } : o)));
    setSelected(null);
  };

  if (authLoading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Хандах эрхгүй</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Танд хүргэлт шивэх эрх олгогдоогүй байна. Админтай холбогдоно уу.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/")}>Нүүр</Button>
          <Button onClick={signOut}>Гарах</Button>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Салбар оноогдоогүй</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Таныг ямар салбараас шивэх нь тодорхойгүй байна. Админд хандана уу.
        </p>
        <Button onClick={signOut}>Гарах</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Салбар</div>
              <div className="font-semibold truncate">{branch.name}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Гарах
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {!selected ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Захиалгын дугаар, утас, хаягаар хайх"
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={loadOrders} disabled={loadingOrders}>
                {loadingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : "Шинэчлэх"}
              </Button>
            </div>

            <div className="space-y-2">
              {filtered.length === 0 && !loadingOrders && (
                <div className="text-center text-muted-foreground py-12 text-sm">
                  Захиалга олдсонгүй
                </div>
              )}
              {filtered.map((o) => {
                const itemsArr = Array.isArray(o.items) ? o.items : [];
                return (
                  <button
                    key={o.id}
                    onClick={() => openOrder(o)}
                    className="w-full text-left bg-card border border-border rounded-xl p-3 hover:border-primary transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">
                          {o.order_ref || o.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {o.guest_name || "—"} · {o.phone || "Утасгүй"} · {itemsArr.length} бараа
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {o.shipping_address || "Хаяг шивээгүй"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("mn-MN")}
                        </div>
                        {o.branch && (
                          <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full bg-secondary inline-block">
                            {o.branch}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
            >
              <ChevronLeft className="h-4 w-4" /> Буцах
            </button>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Захиалга</div>
                <div className="font-semibold">{selected.order_ref || selected.id.slice(0, 8)}</div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Утасны дугаар
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9999 0000"
                  inputMode="tel"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Хүргэлтийн хаяг
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Дүүрэг, хороо, байр, орц, давхар, тоот"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Тэмдэглэл (заавал биш)
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Жишээ нь: цагаа залгаарай"
                />
              </div>

              <div className="rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                Энэ захиалгад <span className="font-semibold">{branch.name}</span> салбар тэмдэглэгдэнэ.
              </div>

              <Button onClick={submit} disabled={saving} className="w-full">
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Хадгалж байна...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Хадгалах</>
                )}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DeliveryEntryPage;
