import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, User, Mail, Phone, Calendar, ShieldCheck, Loader2, Save, MapPin, Plus, Trash2, Home, Briefcase, Map as MapIcon, Check, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setPhone(user.user_metadata?.phone || "");
      fetchAddresses();
    }
  }, [user]);

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
      const { error } = await supabase
        .from("user_addresses" as any)
        .insert([{ ...newAddress, user_id: user?.id }]);
      
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
      const { error } = await supabase
        .from("user_addresses" as any)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Хаяг устгагдлаа");
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_addresses" as any)
        .update({ is_default: true } as any)
        .eq("id", id);
      
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
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone
        }
      });

      if (error) throw error;
      
      toast.success("Мэдээлэл амжилттай хадгалагдлаа");
    } catch (error: any) {
      toast.error(error.message || "Мэдээлэл хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const userData = [
    { 
      label: "Бүтэн нэр", 
      value: fullName, 
      icon: User, 
      editable: true,
      onChange: (v: string) => setFullName(v),
      placeholder: "Таны нэр"
    },
    { 
      label: "Имэйл хаяг", 
      value: user.email, 
      icon: Mail, 
      editable: false 
    },
    { 
      label: "Утасны дугаар", 
      value: phone, 
      icon: Phone, 
      editable: true,
      onChange: (v: string) => setPhone(v),
      placeholder: "Холбоо барих утас"
    },
    { 
      label: "Бүртгүүлсэн огноо", 
      value: new Date(user.created_at).toLocaleDateString("mn-MN"), 
      icon: Calendar, 
      editable: false 
    },
    { 
      label: "Статус", 
      value: "Идэвхтэй", 
      icon: ShieldCheck, 
      color: "text-green-500", 
      editable: false 
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-border md:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Хэрэглэгчийн мэдээлэл</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Desktop Title */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Миний мэдээлэл</h1>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-3xl text-center shadow-sm">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-background shadow-inner">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold">{fullName || "Хэрэглэгч"}</h2>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>

          {/* Details List */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            {userData.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx} 
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-5 ${
                    idx !== userData.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icon className={`h-5 w-5 ${item.color || "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {item.label}
                      </p>
                      {item.editable ? (
                        <input
                          type="text"
                          value={item.value || ""}
                          onChange={(e) => item.onChange?.(e.target.value)}
                          placeholder={item.placeholder}
                          className="w-full text-sm font-semibold text-foreground mt-0.5 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/20 rounded px-1 -ml-1"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Мэдээлэл хадгалах
          </button>

          {/* Addresses Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Миний хаягууд</h3>
              </div>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="h-4 w-4" /> Шинэ хаяг
              </button>
            </div>

            {showAddressForm && (
              <div className="bg-card border border-primary/20 rounded-3xl p-5 space-y-4 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-3">
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
                      {/* Using static districts list since it's common in this app */}
                      {["Баянзүрх", "Хан-Уул", "Баянгол", "Сонгинохайрхан", "Чингэлтэй", "Сүхбаатар", "Налайх", "Багануур", "Багахангай"].map(d => (
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
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddressForm(false)}
                    className="flex-1 bg-secondary text-foreground py-3 rounded-xl font-bold text-sm"
                  >
                    Болих
                  </button>
                  <button
                    onClick={handleAddAddress}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm"
                  >
                    Хадгалах
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {loadingAddresses ? (
                <div className="text-center py-4 text-xs text-muted-foreground">Ачаалж байна...</div>
              ) : addresses.length === 0 ? (
                <div className="bg-secondary/20 border border-dashed border-border rounded-3xl p-8 text-center">
                  <MapIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Та одоогоор хаяг бүртгүүлээгүй байна.</p>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id} className="bg-card border border-border rounded-3xl p-5 shadow-sm relative group overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-2 rounded-xl ${addr.is_default ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          {addr.name.toLowerCase().includes('гэр') ? <Home className="h-4 w-4" /> : 
                           addr.name.toLowerCase().includes('ажил') ? <Briefcase className="h-4 w-4" /> : 
                           <MapPin className="h-4 w-4" />}
                        </div>
                        <div>
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
                      <div className="flex gap-1">
                        {!addr.is_default && (
                          <button
                            onClick={() => handleSetDefault(addr.id)}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            title="Үндсэн хаяг болгох"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Edit Info Note */}
          <div className="p-4 bg-secondary/30 rounded-2xl border border-dashed border-border">
            <p className="text-xs text-muted-foreground leading-relaxed text-center">
              Имэйл хаягийг аюулгүй байдлын үүднээс өөрчлөх боломжгүй.
            </p>
          </div>

          {/* Logout Button */}
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
