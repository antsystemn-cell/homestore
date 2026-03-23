import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, Plus, Pencil, Trash2, Users, ShoppingBag, Package,
  BarChart3, LayoutDashboard, Search, X, AlertTriangle, Image as ImageIcon, Eye, Upload, Loader2, ChevronDown, Tag, Layers
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/data/products";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tab = "stats" | "products" | "orders" | "users" | "categories" | "brands";

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("stats");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Category/Brand form state
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [editBrandId, setEditBrandId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: 0, original_price: 0,
    image_url: "", category: "general", discount: 0,
    is_new: false, is_on_sale: false,
    product_code: "", specifications: [] as { key: string; value: string }[],
    detail_media: [] as { type: "image" | "video"; url: string; caption: string }[],
    brand_id: "",
    colors: [] as { name: string; image: string }[],
    sizes: [] as string[],
  });
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");

  // Detail media file input
  const detailMediaFileRef = useRef<HTMLInputElement>(null);

  const handleDetailMediaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newMedia: { type: "image" | "video"; url: string; caption: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/") && !/\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif|tiff?)$/i.test(file.name)) continue;
      if (file.size > 5 * 1024 * 1024) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = (ev) => resolve(ev.target?.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      newMedia.push({ type: "image", url: dataUrl, caption: "" });
    }
    if (newMedia.length > 0) {
      setForm((prev) => ({ ...prev, detail_media: [...prev.detail_media, ...newMedia] }));
      toast.success(`${newMedia.length} зураг нэмэгдлээ`);
    }
    if (detailMediaFileRef.current) detailMediaFileRef.current.value = "";
  };

  // Multiple images
  const [extraImages, setExtraImages] = useState<string[]>([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraFileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validExt = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif|tiff?)$/i;
    if (!file.type.startsWith("image/") && !validExt.test(file.name)) { toast.error("Зөвхөн зураг оруулна уу"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Зураг 5MB-ээс бага байх ёстой"); return; }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((prev) => ({ ...prev, image_url: dataUrl }));
      setUploading(false);
      toast.success("Зураг амжилттай оруулагдлаа");
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error("Зураг уншихад алдаа гарлаа");
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExtraImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    let hasError = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/") && !/\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif|tiff?)$/i.test(file.name)) { hasError = true; continue; }
      if (file.size > 5 * 1024 * 1024) { hasError = true; continue; }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = (ev) => resolve(ev.target?.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      newImages.push(dataUrl);
    }
    if (hasError) toast.error("Зарим зураг оруулж чадсангүй (5MB-ээс бага, зураг файл байх ёстой)");
    if (newImages.length > 0) {
      setExtraImages((prev) => [...prev, ...newImages]);
      toast.success(`${newImages.length} зураг нэмэгдлээ`);
    }
    if (extraFileInputRef.current) extraFileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Админ эрхгүй байна");
      navigate("/");
    }
  }, [isAdmin, authLoading]);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchUsers();
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Failed to load admin products", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to load admin orders", error);
      setOrders([]);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      toast.error("Төлөв өөрчлөхөд алдаа гарлаа");
    } else {
      toast.success(`Захиалгын төлөв "${statusLabels[newStatus]}" болж өөрчлөгдлөө`);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "Хүлээгдэж буй",
    processing: "Боловсруулж буй",
    completed: "Дууссан",
    cancelled: "Цуцлагдсан",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    processing: "bg-blue-500/10 text-blue-600",
    completed: "bg-green-500/10 text-green-600",
    cancelled: "bg-red-500/10 text-red-600",
  };

  // Categories & Brands CRUD
  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from("categories").select("*").order("position");
      setDbCategories(data || []);
    } catch { setDbCategories([]); }
  };

  const fetchBrands = async () => {
    try {
      const { data } = await supabase.from("brands").select("*").order("name");
      setDbBrands(data || []);
    } catch { setDbBrands([]); }
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) { toast.error("Ангилалын нэр оруулна уу"); return; }
    if (editCatId) {
      const { error } = await supabase.from("categories").update({ name: catName, icon: catIcon || null }).eq("id", editCatId);
      if (error) toast.error(error.message);
      else toast.success("Ангилал шинэчлэгдлээ");
    } else {
      const { error } = await supabase.from("categories").insert({ name: catName, icon: catIcon || null, position: dbCategories.length } as any);
      if (error) toast.error(error.message);
      else toast.success("Ангилал нэмэгдлээ");
    }
    setCatName(""); setCatIcon(""); setEditCatId(null);
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ангилал устгагдлаа"); fetchCategories(); }
  };

  const handleSaveBrand = async () => {
    if (!brandName.trim()) { toast.error("Брэндийн нэр оруулна уу"); return; }
    if (editBrandId) {
      const { error } = await supabase.from("brands").update({ name: brandName, logo_url: brandLogo || null }).eq("id", editBrandId);
      if (error) toast.error(error.message);
      else toast.success("Брэнд шинэчлэгдлээ");
    } else {
      const { error } = await supabase.from("brands").insert({ name: brandName, logo_url: brandLogo || null } as any);
      if (error) toast.error(error.message);
      else toast.success("Брэнд нэмэгдлээ");
    }
    setBrandName(""); setBrandLogo(""); setEditBrandId(null);
    fetchBrands();
  };

  const handleDeleteBrand = async (id: string) => {
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Брэнд устгагдлаа"); fetchBrands(); }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Failed to load admin users", error);
      setUsers([]);
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: 0, original_price: 0, image_url: "", category: "general", discount: 0, is_new: false, is_on_sale: false, product_code: "", specifications: [], detail_media: [], brand_id: "", colors: [], sizes: [] });
    setNewColor(""); setNewSize("");
    setEditId(null);
    setShowForm(false);
    setExtraImages([]);
  };

  const handleSaveProduct = async () => {
    if (!form.name.trim()) { toast.error("Барааны нэр заавал бөглөнө"); return; }
    if (!form.price || form.price <= 0) { toast.error("Зөв үнэ оруулна уу"); return; }
    setLoading(true);
    const payload = {
      name: form.name, description: form.description, price: form.price,
      original_price: form.original_price, image_url: form.image_url,
      category: form.category, discount: form.discount,
      is_new: form.is_new, is_on_sale: form.is_on_sale,
      product_code: form.product_code || null,
      specifications: form.specifications.filter(s => s.key.trim() && s.value.trim()),
      detail_media: form.detail_media.filter(m => m.url.trim()),
      brand_id: form.brand_id || null,
      colors: form.colors.filter(c => c.name.trim()),
      sizes: form.sizes.filter(s => s.trim()),
    };
    let productId = editId;
    if (editId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); setLoading(false); return; }
      await supabase.from("product_images").delete().eq("product_id", editId);
      toast.success("Бараа амжилттай шинэчлэгдлээ");
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      productId = data.id;
      toast.success("Бараа амжилттай нэмэгдлээ");
    }
    // Save extra images
    if (productId && extraImages.length > 0) {
      const rows = extraImages.map((url, i) => ({
        product_id: productId!,
        image_url: url,
        position: i,
      }));
      const { error: imgErr } = await supabase.from("product_images").insert(rows);
      if (imgErr) toast.error("Нэмэлт зураг хадгалахад алдаа: " + imgErr.message);
    }
    resetForm();
    fetchProducts();
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("products").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success(`"${deleteTarget.name}" амжилттай устгагдлаа`); fetchProducts(); }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleEditProduct = async (p: any) => {
    const specs = Array.isArray(p.specifications) ? p.specifications : [];
    const media = Array.isArray(p.detail_media) ? p.detail_media : [];
    setForm({
      name: p.name, description: p.description || "", price: p.price,
      original_price: p.original_price || 0, image_url: p.image_url || "",
      category: p.category, discount: p.discount || 0,
      is_new: p.is_new, is_on_sale: p.is_on_sale,
      product_code: p.product_code || "",
      specifications: specs.map((s: any) => ({ key: s.key || "", value: s.value || "" })),
      detail_media: media.map((m: any) => ({ type: m.type || "image", url: m.url || "", caption: m.caption || "" })),
      brand_id: p.brand_id || "",
      colors: Array.isArray(p.colors) ? p.colors.map((c: any) => typeof c === 'string' ? { name: c, image: '' } : { name: c.name || '', image: c.image || '' }) : [],
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
    });
    setEditId(p.id);
    setShowForm(true);
    // Load extra images
    const { data } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", p.id)
      .order("position");
    setExtraImages((data || []).map((r: any) => r.image_url));
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(q) || (p.product_code && p.product_code.toLowerCase().includes(q));
    const matchCategory = filterCategory === "all" || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const categories = [...new Set(products.map((p) => p.category))];

  const sidebarItems: { id: Tab; label: string; icon: any }[] = [
    { id: "stats", label: "Статистик", icon: BarChart3 },
    { id: "products", label: "Бараа", icon: Package },
    { id: "categories", label: "Ангилал", icon: Layers },
    { id: "brands", label: "Брэнд", icon: Tag },
    { id: "orders", label: "Захиалга", icon: ShoppingBag },
    { id: "users", label: "Хэрэглэгч", icon: Users },
  ];

  const totalRevenue = orders.reduce((s: number, o: any) => s + o.total, 0);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    orders.forEach((o: any) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + (o.total || 0);
    });
    const result = [];
    const now = new Date();
    const monthNames = ["1-р сар","2-р сар","3-р сар","4-р сар","5-р сар","6-р сар","7-р сар","8-р сар","9-р сар","10-р сар","11-р сар","12-р сар"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      result.push({ name: monthNames[d.getMonth()], revenue: months[key] || 0 });
    }
    return result;
  }, [orders]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    products.forEach((p: any) => { cats[p.category] = (cats[p.category] || 0) + 1; });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [products]);

  const orderStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    orders.forEach((o: any) => { statuses[o.status] = (statuses[o.status] || 0) + 1; });
    const labels: Record<string, string> = { pending: "Хүлээгдэж буй", processing: "Боловсруулж буй", completed: "Дууссан", cancelled: "Цуцлагдсан" };
    return Object.entries(statuses).map(([key, value]) => ({ name: labels[key] || key, value }));
  }, [orders]);

  const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Уншиж байна...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Бараа устгах
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> барааг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-card border-r border-border min-h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm">HomeStore</h1>
              <p className="text-[11px] text-muted-foreground">Админ удирдлага</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                <Icon className="h-4 w-4" />
                {item.label}
                {item.id === "products" && <span className="ml-auto text-xs opacity-70">{products.length}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Нүүр хуудас
          </button>
        </div>
      </aside>

      {/* Mobile Header + Tabs */}
      <div className="md:hidden">
        <header className="sticky top-0 z-50 bg-background px-4 py-3 flex items-center gap-3 border-b border-border">
          <button onClick={() => navigate("/")} className="p-2 rounded-full bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Админ удирдлага</h1>
        </header>
        <div className="flex border-b border-border">
          {sidebarItems.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  tab === t.id ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground"
                }`}>
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between px-8 py-6 border-b border-border bg-card">
          <div>
            <h2 className="text-xl font-bold">{sidebarItems.find(s => s.id === tab)?.label}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tab === "stats" && "Дэлгүүрийн ерөнхий мэдээлэл"}
              {tab === "products" && `Нийт ${products.length} бараа`}
              {tab === "orders" && `Нийт ${orders.length} захиалга`}
              {tab === "users" && `Нийт ${users.length} хэрэглэгч`}
              {tab === "categories" && `Нийт ${dbCategories.length} ангилал`}
              {tab === "brands" && `Нийт ${dbBrands.length} брэнд`}
            </p>
          </div>
          {tab === "products" && (
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Бараа нэмэх
            </button>
          )}
        </div>

        <div className="p-4 md:p-8 max-w-5xl">
          {/* Stats */}
          {tab === "stats" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Нийт бараа", value: products.length, icon: Package, color: "bg-blue-500/10 text-blue-600" },
                  { label: "Нийт захиалга", value: orders.length, icon: ShoppingBag, color: "bg-green-500/10 text-green-600" },
                  { label: "Нийт хэрэглэгч", value: users.length, icon: Users, color: "bg-purple-500/10 text-purple-600" },
                  { label: "Нийт орлого", value: formatPrice(totalRevenue), icon: BarChart3, color: "bg-amber-500/10 text-amber-600" },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="bg-card rounded-2xl p-6 border border-border">
                      <div className={`h-10 w-10 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-extrabold">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                <div className="bg-card rounded-2xl p-5 border border-border">
                  <h3 className="text-sm font-bold mb-4">Сарын орлого</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                        <Tooltip formatter={(v: number) => [formatPrice(v), "Орлого"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-5 border border-border">
                  <h3 className="text-sm font-bold mb-4">Ангилалын тархалт</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {orderStatusData.length > 0 && (
                  <div className="bg-card rounded-2xl p-5 border border-border lg:col-span-2">
                    <h3 className="text-sm font-bold mb-4">Захиалгын төлөв</h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={orderStatusData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={110} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Products */}
          {tab === "products" && (
            <div>
              {/* Mobile add button */}
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="md:hidden flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-xs font-bold mb-4">
                <Plus className="h-4 w-4" /> Бараа нэмэх
              </button>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Бараа хайх..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl bg-secondary pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[140px]"
                >
                  <option value="all">Бүх ангилал</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {searchQuery || filterCategory !== "all" ? (
                <p className="text-xs text-muted-foreground mb-3">
                  {filteredProducts.length} бараа олдлоо
                </p>
              ) : null}

              {/* Product Form */}
              {showForm && (
                <div className="bg-card rounded-2xl p-4 md:p-6 border border-border mb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">{editId ? "Бараа засах" : "Шинэ бараа нэмэх"}</h3>
                    <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Image upload */}
                  <div className="flex items-start gap-4">
                    <div
                      className="h-24 w-24 rounded-xl bg-secondary border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/40 transition-colors relative group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                      ) : form.image_url ? (
                        <>
                          <img src={form.image_url} alt="Preview" className="h-full w-full object-cover rounded-xl"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                            <Upload className="h-5 w-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-5 w-5 text-muted-foreground/60" />
                          <span className="text-[9px] text-muted-foreground/60">Зураг</span>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                         accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <input placeholder="Барааны нэр *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <div className="flex gap-2">
                        <input placeholder="Зургийн URL (эсвэл дээр дарж upload хийнэ)" value={form.image_url?.startsWith("data:") ? "📷 Зураг оруулсан" : form.image_url}
                          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                          readOnly={form.image_url?.startsWith("data:")}
                          className="flex-1 rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        {form.image_url && (
                          <button type="button" onClick={() => setForm({ ...form, image_url: "" })}
                            className="px-3 rounded-xl bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Extra images */}
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-2 block">Нэмэлт зургууд ({extraImages.length})</label>
                    <div className="flex flex-wrap gap-2">
                      {extraImages.map((img, idx) => (
                        <div key={idx} className="relative h-16 w-16 rounded-lg bg-secondary overflow-hidden group">
                          <img src={img} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setExtraImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => extraFileInputRef.current?.click()}
                        className="h-16 w-16 rounded-lg border-2 border-dashed border-border bg-secondary flex flex-col items-center justify-center hover:border-primary/40 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-muted-foreground/60" />
                        <span className="text-[8px] text-muted-foreground/60">Нэмэх</span>
                      </button>
                      <input
                        ref={extraFileInputRef}
                        type="file"
                         accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff"
                        multiple
                        className="hidden"
                        onChange={handleExtraImageUpload}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Бүтээгдэхүүний код</label>
                      <input placeholder="SKU-001" value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>

                  <textarea placeholder="Тайлбар" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" rows={3} />

                  {/* Specifications */}
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-2 block">Үзүүлэлтүүд ({form.specifications.length})</label>
                    <div className="space-y-2">
                      {form.specifications.map((spec, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input placeholder="Нэр (жишээ: Өнгө)" value={spec.key}
                            onChange={(e) => {
                              const specs = [...form.specifications];
                              specs[idx] = { ...specs[idx], key: e.target.value };
                              setForm({ ...form, specifications: specs });
                            }}
                            className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <input placeholder="Утга (жишээ: Хар)" value={spec.value}
                            onChange={(e) => {
                              const specs = [...form.specifications];
                              specs[idx] = { ...specs[idx], value: e.target.value };
                              setForm({ ...form, specifications: specs });
                            }}
                            className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <button type="button" onClick={() => setForm({ ...form, specifications: form.specifications.filter((_, i) => i !== idx) })}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setForm({ ...form, specifications: [...form.specifications, { key: "", value: "" }] })}
                        className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1">
                        <Plus className="h-3.5 w-3.5" /> Үзүүлэлт нэмэх
                      </button>
                    </div>
                  </div>

                  {/* Detail Media (images & videos) */}
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-2 block">Дэлгэрэнгүй зураг & бичлэг ({form.detail_media.length})</label>
                    <div className="space-y-2">
                      {form.detail_media.map((media, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-secondary/50 rounded-xl p-3">
                          <div className="h-14 w-14 rounded-lg bg-secondary overflow-hidden shrink-0">
                            {media.type === "image" ? (
                              <img src={media.url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Eye className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <select value={media.type}
                                onChange={(e) => {
                                  const dm = [...form.detail_media];
                                  dm[idx] = { ...dm[idx], type: e.target.value as "image" | "video" };
                                  setForm({ ...form, detail_media: dm });
                                }}
                                className="rounded-lg bg-secondary px-2 py-1 text-xs focus:outline-none">
                                <option value="image">Зураг</option>
                                <option value="video">Бичлэг</option>
                              </select>
                              <input placeholder={media.type === "video" ? "YouTube/видео URL" : "Зураг URL"} value={media.url.startsWith("data:") ? "📷 Зураг оруулсан" : media.url}
                                readOnly={media.url.startsWith("data:")}
                                onChange={(e) => {
                                  const dm = [...form.detail_media];
                                  dm[idx] = { ...dm[idx], url: e.target.value };
                                  setForm({ ...form, detail_media: dm });
                                }}
                                className="flex-1 rounded-lg bg-secondary px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
                            </div>
                            <input placeholder="Тайлбар (заавал биш)" value={media.caption}
                              onChange={(e) => {
                                const dm = [...form.detail_media];
                                dm[idx] = { ...dm[idx], caption: e.target.value };
                                setForm({ ...form, detail_media: dm });
                              }}
                              className="w-full rounded-lg bg-secondary px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
                          </div>
                          <button type="button" onClick={() => setForm({ ...form, detail_media: form.detail_media.filter((_, i) => i !== idx) })}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => detailMediaFileRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1">
                          <ImageIcon className="h-3.5 w-3.5" /> Зураг оруулах
                        </button>
                        <button type="button"
                          onClick={() => setForm({ ...form, detail_media: [...form.detail_media, { type: "video", url: "", caption: "" }] })}
                          className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1">
                          <Plus className="h-3.5 w-3.5" /> Бичлэг URL нэмэх
                        </button>
                      </div>
                      <input ref={detailMediaFileRef} type="file" accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff" multiple className="hidden" onChange={handleDetailMediaImageUpload} />
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-2 block">Өнгө ({form.colors.length})</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.colors.map((color, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-secondary rounded-lg px-3 py-1.5 text-xs font-medium">
                          {color}
                          <button type="button" onClick={() => setForm({ ...form, colors: form.colors.filter((_, i) => i !== idx) })}
                            className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input placeholder="Өнгө нэмэх (жишээ: Хар)" value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && newColor.trim()) { e.preventDefault(); setForm({ ...form, colors: [...form.colors, newColor.trim()] }); setNewColor(""); } }}
                        className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <button type="button" onClick={() => { if (newColor.trim()) { setForm({ ...form, colors: [...form.colors, newColor.trim()] }); setNewColor(""); } }}
                        className="px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sizes */}
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-2 block">Хэмжээ ({form.sizes.length})</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.sizes.map((size, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-secondary rounded-lg px-3 py-1.5 text-xs font-medium">
                          {size}
                          <button type="button" onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, i) => i !== idx) })}
                            className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input placeholder="Хэмжээ нэмэх (жишээ: XL)" value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && newSize.trim()) { e.preventDefault(); setForm({ ...form, sizes: [...form.sizes, newSize.trim()] }); setNewSize(""); } }}
                        className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <button type="button" onClick={() => { if (newSize.trim()) { setForm({ ...form, sizes: [...form.sizes, newSize.trim()] }); setNewSize(""); } }}
                        className="px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Үнэ *</label>
                      <input type="number" placeholder="0" value={form.price || ""} onChange={(e) => setForm({ ...form, price: +e.target.value })}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Хуучин үнэ</label>
                      <input type="number" placeholder="0" value={form.original_price || ""} onChange={(e) => setForm({ ...form, original_price: +e.target.value })}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Хямдрал %</label>
                      <input type="number" placeholder="0" value={form.discount || ""} onChange={(e) => setForm({ ...form, discount: +e.target.value })}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Ангилал</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                        {dbCategories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Брэнд</label>
                      <select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">Брэндгүй</option>
                        {dbBrands.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.is_new} onChange={(e) => setForm({ ...form, is_new: e.target.checked })} className="rounded" />
                      Шинэ бараа
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.is_on_sale} onChange={(e) => setForm({ ...form, is_on_sale: e.target.checked })} className="rounded" />
                      Хямдралтай
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2 sticky bottom-0 bg-card pb-2 z-10 border-t border-border mt-4 pt-4">
                    <button onClick={handleSaveProduct} disabled={loading}
                      className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Хадгалж байна...</> : editId ? "💾 Хадгалах" : "➕ Нэмэх"}
                    </button>
                    <button onClick={resetForm} className="flex-1 bg-secondary rounded-xl py-3 text-sm font-medium hover:bg-secondary/80 transition-colors">
                      Болих
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop table view */}
              <div className="hidden md:block">
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Бараа</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Ангилал</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Үнэ</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Хямдрал</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-secondary overflow-hidden shrink-0">
                                {p.image_url ? (
                                  <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-medium block truncate max-w-[200px]">{p.name}</span>
                                {p.is_new && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Шинэ</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-secondary px-2.5 py-1 rounded-full font-medium text-muted-foreground">{p.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold">{formatPrice(p.price)}</span>
                            {p.original_price > 0 && (
                              <span className="text-xs text-muted-foreground line-through ml-2">{formatPrice(p.original_price)}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {p.discount ? (
                              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">-{p.discount}%</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => navigate(`/product/${p.id}`)}
                                className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Харах">
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => handleEditProduct(p)}
                                className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Засах">
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Устгах">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && !loading && (
                    <p className="text-center text-sm text-muted-foreground py-12">
                      {searchQuery || filterCategory !== "all" ? "Хайлтад тохирох бараа олдсонгүй" : "Бараа байхгүй"}
                    </p>
                  )}
                </div>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden space-y-2">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                    <div className="h-12 w-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs font-bold">{formatPrice(p.price)}</p>
                        {p.discount > 0 && <span className="text-[10px] text-destructive font-bold">-{p.discount}%</span>}
                      </div>
                    </div>
                    <button onClick={() => handleEditProduct(p)} className="p-2 rounded-lg bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleteTarget({ id: p.id, name: p.name })} className="p-2 rounded-lg bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {filteredProducts.length === 0 && !loading && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {searchQuery || filterCategory !== "all" ? "Хайлтад тохирох бараа олдсонгүй" : "Бараа байхгүй"}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Orders */}
          {tab === "orders" && (
            <div>
              <div className="hidden md:block">
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Захиалгын ID</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Дүн</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Утас</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Огноо</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Төлөв</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium">#{o.id.slice(0, 8)}</td>
                          <td className="px-6 py-4 text-sm font-semibold">{formatPrice(o.total)}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{o.phone || "—"}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("mn-MN")}</td>
                          <td className="px-6 py-4">
                            <select
                              value={o.status}
                              onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusColors[o.status] || "bg-secondary text-muted-foreground"}`}
                            >
                              {Object.entries(statusLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && !loading && (
                    <p className="text-center text-sm text-muted-foreground py-12">Захиалга байхгүй</p>
                  )}
                </div>
              </div>
              <div className="md:hidden space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold">#{o.id.slice(0, 8)}</span>
                      <select
                        value={o.status}
                        onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none ${statusColors[o.status] || "bg-secondary text-muted-foreground"}`}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatPrice(o.total)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{o.phone || "Утас байхгүй"} · {new Date(o.created_at).toLocaleDateString("mn-MN")}</p>
                  </div>
                ))}
                {orders.length === 0 && !loading && (
                  <p className="text-center text-sm text-muted-foreground py-8">Захиалга байхгүй</p>
                )}
              </div>
            </div>
          )}

          {/* Users */}
          {tab === "users" && (
            <div>
              <div className="hidden md:block">
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Хэрэглэгч</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Утас</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Бүртгүүлсэн</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                {(u.full_name || "?")[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">{u.full_name || "Нэргүй"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{u.phone || "—"}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString("mn-MN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && !loading && (
                    <p className="text-center text-sm text-muted-foreground py-12">Хэрэглэгч байхгүй</p>
                  )}
                </div>
              </div>
              <div className="md:hidden space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
                      {(u.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{u.full_name || "Нэргүй"}</p>
                      <p className="text-[10px] text-muted-foreground">{u.phone || "Утас байхгүй"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString("mn-MN")}</span>
                  </div>
                ))}
                {users.length === 0 && !loading && (
                  <p className="text-center text-sm text-muted-foreground py-8">Хэрэглэгч байхгүй</p>
                )}
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {tab === "categories" && (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
                <h3 className="font-bold text-sm">{editCatId ? "Ангилал засах" : "Шинэ ангилал нэмэх"}</h3>
                <div className="flex gap-2">
                  <input placeholder="Ангилалын нэр *" value={catName} onChange={(e) => setCatName(e.target.value)}
                    className="flex-1 rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input placeholder="Icon нэр (жишээ: Zap)" value={catIcon} onChange={(e) => setCatIcon(e.target.value)}
                    className="w-40 rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveCategory}
                    className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                    {editCatId ? "Шинэчлэх" : "Нэмэх"}
                  </button>
                  {editCatId && (
                    <button onClick={() => { setCatName(""); setCatIcon(""); setEditCatId(null); }}
                      className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                      Болих
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {dbCategories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Layers className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        {c.icon && <p className="text-[10px] text-muted-foreground">Icon: {c.icon}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setCatName(c.name); setCatIcon(c.icon || ""); setEditCatId(c.id); }}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteCategory(c.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {dbCategories.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Ангилал байхгүй</p>
                )}
              </div>
            </div>
          )}

          {/* Brands Tab */}
          {tab === "brands" && (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
                <h3 className="font-bold text-sm">{editBrandId ? "Брэнд засах" : "Шинэ брэнд нэмэх"}</h3>
                <div className="flex flex-col gap-3">
                  <input placeholder="Брэндийн нэр *" value={brandName} onChange={(e) => setBrandName(e.target.value)}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <div className="flex items-center gap-3">
                    {brandLogo && (
                      <img src={brandLogo} alt="Лого" className="h-12 w-12 rounded-lg object-contain border border-border bg-background" />
                    )}
                    <label className="cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors rounded-xl px-4 py-2.5 text-sm font-medium">
                      {brandLogo ? "Лого солих" : "Лого оруулах"}
                      <input type="file" className="hidden"
                        accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.svg,.heic,.heif,.avif"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith("image/") && !/\.(png|jpe?g|gif|webp|svg|heic|heif|avif)$/i.test(file.name)) {
                            toast.error("Зөвхөн зургийн файл оруулна уу");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => setBrandLogo(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {brandLogo && (
                      <button type="button" onClick={() => setBrandLogo("")} className="text-destructive text-xs hover:underline">Устгах</button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveBrand}
                    className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                    {editBrandId ? "Шинэчлэх" : "Нэмэх"}
                  </button>
                  {editBrandId && (
                    <button onClick={() => { setBrandName(""); setBrandLogo(""); setEditBrandId(null); }}
                      className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                      Болих
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {dbBrands.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="h-10 w-10 rounded-lg object-contain bg-secondary p-1" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Tag className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-sm font-semibold">{b.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setBrandName(b.name); setBrandLogo(b.logo_url || ""); setEditBrandId(b.id); }}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteBrand(b.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {dbBrands.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Брэнд байхгүй</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
