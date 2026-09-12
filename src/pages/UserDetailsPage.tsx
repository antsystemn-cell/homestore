import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft, User, Mail, Phone, Calendar, ShieldCheck, Loader2, Save, MapPin, Plus, Trash2,
  Home, Briefcase, Map as MapIcon, Check, LogOut, LogIn, Truck, Gift, ShoppingBag, ChevronRight,
  ChevronDown, ChevronUp, Sparkles, Crown, Package, Clock, CheckCircle2, AlertCircle, Copy, Hash,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";
import MyWalletCreditsCard from "@/components/store/MyWalletCreditsCard";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { toast } from "sonner";

const statusInfo = (status: string) => {
  switch (status) {
    case "pending": return { label: "Хүлээгдэж буй", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" };
    case "confirmed": return { label: "Баталгаажсан", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" };
    case "preparing": return { label: "Бэлтгэгдэж буй", icon: Package, color: "text-indigo-500", bg: "bg-indigo-500/10" };
    case "delivering": return { label: "Хүргэлтэнд гарсан", icon: Truck, color: "text-purple-500", bg: "bg-purple-500/10" };
    case "completed": return { label: "Хүргэгдсэн", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" };
    case "cancelled": return { label: "Цуцлагдсан", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" };
    default: return { label: status, icon: Clock, color: "text-muted-foreground", bg: "bg-secondary" };
  }
};

const UserDetailsPage = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ name: "", district: "", khoroo: "", detail: "", is_default: false });

  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setPhone(user.user_metadata?.phone || "");
      fetchAddresses();
      fetchProfileAndOrders();
    }
  }, [user]);

  const fetchProfileAndOrders = async () => {
    if (!user) return;
    try {
      const [{ data: prof }, { data: ords }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, address, loyalty_points, referral_code, created_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id, order_ref, status, total, created_at, items, shipping_address").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      ]);
      setProfile(prof || null);
      setOrders(ords || []);
      if (!user.user_metadata?.phone && (prof as any)?.phone) setPhone((prof as any).phone);
    } catch (err) {
      console.error("Error loading profile data:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchAddresses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_addresses" as any)
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAddresses(data || []);
    } catch (err) {
      console.error("Error fetching addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.name || !newAddress.district || !newAddress.detail) {
      toast.error("Мэдээллээ бүрэн бөглөнө үү");
      return;
    }
    try {
      const { error } = await supabase.from("user_addresses" as any).insert([{ ...newAddress, user_id: user?.id }]);
      if (error) throw error;
      toast.success("Хаяг амжилттай нэмэгдлээ");
      setShowAddressForm(false);
      setNewAddress({ name: "", district: "", khoroo: "", detail: "", is_default: false });
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from("user_addresses" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Хаяг устгагдлаа");
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await supabase.from("user_addresses" as any).update({ is_default: true } as any).eq("id", id);
      if (error) throw error;
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Уншиж байна...</div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-border md:hidden">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Хэрэглэгчийн мэдээлэл</h1>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col items-center justify-center p-10 bg-card border border-border rounded-3xl text-center shadow-sm">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-5">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Тавтай морилно уу</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs">
              Захиалга хийх, хүслийн жагсаалт болон хаягаа хадгалахын тулд нэвтэрнэ үү.
            </p>
            <button
              onClick={() => {
                sessionStorage.setItem("returnAfterAuth", "/profile/details");
                navigate("/auth");
              }}
              className="w-full max-w-xs py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="h-5 w-5" />
              Нэвтрэх / Бүртгүүлэх
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, phone } });
      if (error) throw error;
      await supabase.from("profiles").update({ full_name: fullName, phone } as any).eq("user_id", user.id);
      toast.success("Мэдээлэл амжилттай хадгалагдлаа");
    } catch (error: any) {
      toast.error(error.message || "Мэдээлэл хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const points = Number(profile?.loyalty_points ?? 0);
  const deliveredOrders = orders.filter((o) => o.status === "completed");
  const totalSpent = deliveredOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const isVip = deliveredOrders.length >= 3;
  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0] || null;
  const lastOrderAddress = orders[0]?.shipping_address || profile?.address || null;

  const detailRows = [
    { label: "Имэйл хаяг", value: user.email, icon: Mail },
    { label: "Бүртгүүлсэн огноо", value: new Date(user.created_at).toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" }), icon: Calendar },
    { label: "Статус", value: isVip ? "VIP хэрэглэгч" : "Идэвхтэй", icon: ShieldCheck, color: "text-green-500" },
    { label: "Урилгын код", value: profile?.referral_code || "—", icon: Hash },
    { label: "Хэрэглэгчийн ID", value: user.id, icon: User, mono: true },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-border md:hidden">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Хэрэглэгчийн мэдээлэл</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 md:py-12">
        {/* Desktop Title */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Миний мэдээлэл</h1>
        </div>

        <div className="space-y-6">
          {/* Summary card */}
          <div className="p-6 bg-card border border-border rounded-3xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-primary">{(fullName || user.email || "?")[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold truncate">{fullName || "Хэрэглэгч"}</h2>
                  {isVip && (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Crown className="h-3 w-3" /> VIP
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-5">
              {[
                { label: "Захиалга", value: orders.length.toString() },
                { label: "Нийт худалдан авалт", value: formatPrice(totalSpent) },
                { label: "Лоялти оноо", value: points.toLocaleString("mn-MN") },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-secondary/40 p-3 text-center">
                  <p className="text-sm font-bold truncate">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Хүргэлтийн мэдээлэл — хамгийн чухал ===== */}
          <section className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Хүргэлтийн мэдээлэл</h3>
                  <p className="text-[11px] text-muted-foreground">Захиалга хүргэхэд ашиглагдана</p>
                </div>
              </div>
              <button onClick={() => setShowAddressForm((v) => !v)} className="text-primary text-xs font-bold flex items-center gap-1">
                <Plus className="h-4 w-4" /> Хаяг
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-background border border-border p-4">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Холбоо барих утас</label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Утасны дугаар"
                    className="w-full text-sm font-semibold bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-background border border-border p-4">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Үндсэн хүргэлтийн хаяг</label>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold leading-snug">
                    {defaultAddress
                      ? `${defaultAddress.district}${defaultAddress.khoroo ? `, ${defaultAddress.khoroo}-р хороо` : ""}, ${defaultAddress.detail}`
                      : lastOrderAddress || "Хаяг бүртгээгүй байна"}
                  </p>
                </div>
              </div>

              {showAddressForm && (
                <div className="bg-background border border-primary/20 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <input
                    placeholder="Хаягийн нэр (жишээ: Гэр, Ажил)"
                    value={newAddress.name}
                    onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newAddress.district}
                      onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value, khoroo: "" })}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Дүүрэг сонгох</option>
                      {["Баянзүрх", "Хан-Уул", "Баянгол", "Сонгинохайрхан", "Чингэлтэй", "Сүхбаатар", "Налайх", "Багануур", "Багахангай"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      <option value="Орон нутаг">Орон нутаг</option>
                    </select>
                    {newAddress.district && newAddress.district !== "Орон нутаг" && (
                      <input
                        type="number"
                        placeholder="Хороо"
                        value={newAddress.khoroo}
                        onChange={(e) => setNewAddress({ ...newAddress, khoroo: e.target.value })}
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    )}
                  </div>
                  <textarea
                    placeholder="Дэлгэрэнгүй хаяг (Байр, тоот...)"
                    value={newAddress.detail}
                    onChange={(e) => setNewAddress({ ...newAddress, detail: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="text-xs text-muted-foreground">Үндсэн хаяг болгох</span>
                  </label>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAddressForm(false)} className="flex-1 bg-secondary text-foreground py-3 rounded-xl font-bold text-sm">
                      Болих
                    </button>
                    <button onClick={handleAddAddress} className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm">
                      Хадгалах
                    </button>
                  </div>
                </div>
              )}

              {/* Saved addresses */}
              {loadingAddresses ? (
                <div className="text-center py-3 text-xs text-muted-foreground">Ачаалж байна...</div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id} className="bg-background border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 p-2 rounded-xl ${addr.is_default ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                          {addr.name.toLowerCase().includes("гэр") ? <Home className="h-4 w-4" /> :
                            addr.name.toLowerCase().includes("ажил") ? <Briefcase className="h-4 w-4" /> :
                              <MapPin className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold">{addr.name}</h4>
                            {addr.is_default && (
                              <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded uppercase">Үндсэн</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {addr.district}, {addr.khoroo && `${addr.khoroo}-р хороо, `}{addr.detail}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!addr.is_default && (
                          <button onClick={() => handleSetDefault(addr.id)} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Үндсэн хаяг болгох">
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleDeleteAddress(addr.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" title="Устгах">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {!loadingAddresses && addresses.length === 0 && !showAddressForm && (
                <div className="bg-background/60 border border-dashed border-border rounded-2xl p-6 text-center">
                  <MapIcon className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Хүргэлтийн хаяг нэмснээр захиалга хийхэд хялбар болно.</p>
                </div>
              )}
            </div>
          </section>

          {/* ===== Урамшуулал, бонус ===== */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Урамшуулал ба бонус</h3>
            </div>

            <div className="rounded-3xl p-5 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-sm">
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Sparkles className="h-4 w-4" /> Лоялти оноо
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold">{points.toLocaleString("mn-MN")}</span>
                <span className="text-xs opacity-80">оноо ≈ {formatPrice(points)}</span>
              </div>
              <p className="text-[11px] mt-2 opacity-80">Захиалга хүргэгдэх бүрт барааны дүнгийн 1%-тай тэнцэх оноо нэмэгдэнэ.</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => navigate("/easy-rewards")} className="flex-1 bg-white/15 hover:bg-white/25 transition-colors rounded-xl py-2 text-xs font-bold">
                  EasyRewards
                </button>
                <button onClick={() => navigate("/spin")} className="flex-1 bg-white/15 hover:bg-white/25 transition-colors rounded-xl py-2 text-xs font-bold">
                  Хүрд эргүүлэх
                </button>
              </div>
            </div>

            {profile?.referral_code && (
              <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Найзаа урих код</p>
                  <p className="text-sm font-bold tracking-wide">{profile.referral_code}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?ref=${profile.referral_code}`);
                    toast.success("Урилгын линк хуулагдлаа");
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary px-3 py-2 rounded-xl bg-primary/10"
                >
                  <Copy className="h-3.5 w-3.5" /> Хуулах
                </button>
              </div>
            )}

            <MyWalletCreditsCard />
          </section>

          {/* ===== Худалдан авалтын түүх ===== */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Худалдан авалтын түүх</h3>
              </div>
              <button onClick={() => navigate("/orders")} className="text-primary text-xs font-bold flex items-center gap-1">
                Бүгд <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loadingOrders ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Ачаалж байна...</div>
            ) : orders.length === 0 ? (
              <div className="bg-secondary/20 border border-dashed border-border rounded-3xl p-8 text-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Та одоогоор захиалга хийгээгүй байна.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-3xl overflow-hidden">
                {orders.slice(0, 5).map((o, i) => {
                  const si = statusInfo(o.status);
                  const Icon = si.icon;
                  const itemCount = Array.isArray(o.items) ? o.items.reduce((s: number, it: any) => s + Number(it.quantity || 1), 0) : 0;
                  return (
                    <button
                      key={o.id}
                      onClick={() => navigate("/orders")}
                      className={`w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition-colors ${i !== Math.min(orders.length, 5) - 1 ? "border-b border-border" : ""}`}
                    >
                      <div className={`h-10 w-10 rounded-xl ${si.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${si.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{o.order_ref || "Захиалга"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("mn-MN")} · {itemCount} бараа · {si.label}
                        </p>
                      </div>
                      <span className="text-sm font-bold">{formatPrice(Number(o.total || 0))}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ===== Хувийн мэдээлэл ===== */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Хувийн мэдээлэл</h3>
            </div>
            <div className="bg-card border border-border rounded-3xl p-5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Бүтэн нэр</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Таны нэр"
                className="w-full mt-1 rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Мэдээлэл хадгалах
            </button>
          </section>

          {/* ===== Дэлгэрэнгүй (collapsible) ===== */}
          <section className="bg-card border border-border rounded-3xl overflow-hidden">
            <button onClick={() => setShowDetails((v) => !v)} className="w-full flex items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Дэлгэрэнгүй мэдээлэл</p>
                  <p className="text-[11px] text-muted-foreground">Бүртгэлийн огноо, статус, имэйл, ID</p>
                </div>
              </div>
              {showDetails ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showDetails && (
              <div className="border-t border-border">
                {detailRows.map((row, idx) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className={`flex items-center gap-4 p-4 ${idx !== detailRows.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <Icon className={`h-4 w-4 ${(row as any).color || "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{row.label}</p>
                        <p className={`text-sm font-semibold truncate ${(row as any).mono ? "font-mono text-xs" : ""}`}>{row.value}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="p-4 border-t border-border">
                  <p className="text-[11px] text-muted-foreground text-center">Имэйл хаягийг аюулгүй байдлын үүднээс өөрчлөх боломжгүй.</p>
                </div>
              </div>
            )}
          </section>

          {/* Logout */}
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-destructive/30 text-destructive font-bold hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Гарах
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default UserDetailsPage;
