import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Plus, Pencil, Trash2, Users, ShoppingBag, Package, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/data/products";

type Tab = "products" | "orders" | "users" | "stats";

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: 0, original_price: 0,
    image_url: "", category: "general", discount: 0,
    is_new: false, is_on_sale: false,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Админ эрхгүй байна");
      navigate("/");
    }
  }, [isAdmin, authLoading]);

  useEffect(() => {
    if (tab === "products") fetchProducts();
    if (tab === "orders") fetchOrders();
    if (tab === "users") fetchUsers();
  }, [tab]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: 0, original_price: 0, image_url: "", category: "general", discount: 0, is_new: false, is_on_sale: false });
    setEditId(null);
    setShowForm(false);
  };

  const handleSaveProduct = async () => {
    if (!form.name || !form.price) {
      toast.error("Нэр, үнэ заавал бөглөнө");
      return;
    }
    setLoading(true);
    if (editId) {
      const { error } = await supabase.from("products").update(form).eq("id", editId);
      if (error) toast.error(error.message);
      else toast.success("Бараа шинэчлэгдлээ");
    } else {
      const { error } = await supabase.from("products").insert(form);
      if (error) toast.error(error.message);
      else toast.success("Бараа нэмэгдлээ");
    }
    resetForm();
    fetchProducts();
    setLoading(false);
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Бараа устгагдлаа");
      fetchProducts();
    }
  };

  const handleEditProduct = (p: any) => {
    setForm({
      name: p.name, description: p.description || "", price: p.price,
      original_price: p.original_price || 0, image_url: p.image_url || "",
      category: p.category, discount: p.discount || 0,
      is_new: p.is_new, is_on_sale: p.is_on_sale,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "products", label: "Бараа", icon: Package },
    { id: "orders", label: "Захиалга", icon: ShoppingBag },
    { id: "users", label: "Хэрэглэгч", icon: Users },
    { id: "stats", label: "Статистик", icon: BarChart3 },
  ];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Уншиж байна...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background px-4 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate("/")} className="p-2 rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Админ удирдлага</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                tab === t.id ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {/* Products Tab */}
        {tab === "products" && (
          <div>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-xs font-bold mb-4"
            >
              <Plus className="h-4 w-4" /> Бараа нэмэх
            </button>

            {showForm && (
              <div className="bg-card rounded-xl p-4 border border-border mb-4 space-y-3">
                <input placeholder="Нэр *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm focus:outline-none" />
                <textarea placeholder="Тайлбар" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm focus:outline-none" rows={2} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Үнэ *" value={form.price || ""} onChange={(e) => setForm({ ...form, price: +e.target.value })}
                    className="rounded-lg bg-secondary px-3 py-2.5 text-sm focus:outline-none" />
                  <input type="number" placeholder="Хуучин үнэ" value={form.original_price || ""} onChange={(e) => setForm({ ...form, original_price: +e.target.value })}
                    className="rounded-lg bg-secondary px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <input placeholder="Зургийн URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm focus:outline-none" />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm focus:outline-none">
                  <option value="general">Ерөнхий</option>
                  <option value="electronics">Цахилгаан бараа</option>
                  <option value="kitchen">Гал тогоо</option>
                  <option value="home">Гэр ахуй</option>
                </select>
                <div className="flex gap-3">
                  <button onClick={handleSaveProduct} disabled={loading}
                    className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-xs font-bold disabled:opacity-50">
                    {editId ? "Шинэчлэх" : "Хадгалах"}
                  </button>
                  <button onClick={resetForm} className="flex-1 bg-secondary rounded-lg py-2.5 text-xs font-medium">
                    Болих
                  </button>
                </div>
              </div>
            )}

            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border mb-2">
                {p.image_url && <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover bg-secondary" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                </div>
                <button onClick={() => handleEditProduct(p)} className="p-2 rounded-lg bg-secondary">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {products.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground py-8">Бараа байхгүй</p>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {tab === "orders" && (
          <div>
            {orders.map((o) => (
              <div key={o.id} className="bg-card rounded-xl p-4 border border-border mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold">#{o.id.slice(0, 8)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    o.status === "pending" ? "bg-warning/10 text-warning" :
                    o.status === "completed" ? "bg-green-100 text-green-700" :
                    "bg-secondary text-muted-foreground"
                  }`}>{o.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatPrice(o.total)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(o.created_at).toLocaleDateString("mn-MN")}
                </p>
              </div>
            ))}
            {orders.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground py-8">Захиалга байхгүй</p>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border mb-2">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
                  {(u.full_name || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{u.full_name || "Нэргүй"}</p>
                  <p className="text-[10px] text-muted-foreground">{u.phone || "Утас байхгүй"}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("mn-MN")}
                </span>
              </div>
            ))}
            {users.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground py-8">Хэрэглэгч байхгүй</p>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {tab === "stats" && (
          <div className="space-y-3">
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground">Нийт бараа</p>
              <p className="text-2xl font-extrabold">{products.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground">Нийт захиалга</p>
              <p className="text-2xl font-extrabold">{orders.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground">Нийт хэрэглэгч</p>
              <p className="text-2xl font-extrabold">{users.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground">Нийт орлого</p>
              <p className="text-2xl font-extrabold">
                {formatPrice(orders.reduce((s: number, o: any) => s + o.total, 0))}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
