import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, Plus, Pencil, Trash2, Users, ShoppingBag, Package,
  BarChart3, LayoutDashboard, Search, X, AlertTriangle, Image as ImageIcon, Eye, Upload, Loader2, ChevronDown, Tag, Layers, Video, Truck, CreditCard, Megaphone, Globe, Copy, Link2
} from "lucide-react";
import WebAnalytics from "@/components/admin/WebAnalytics";
import CollectionsManager from "@/components/admin/CollectionsManager";
import ChatbotSettingsManager from "@/components/admin/ChatbotSettingsManager";

import { useRef } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/data/products";
import { optimizeImage, generateThumbnail, estimateBase64Size } from "@/lib/imageOptimize";
import { resolveColor } from "@/lib/colorMap";
import { cyrillicToLatinSlug } from "@/lib/cyrillicToLatin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { NiimbotBulkXlsxButton } from "@/components/niimbot/NiimbotBulkXlsxButton";
import { NiimbotInstructionsModal } from "@/components/niimbot/NiimbotInstructionsModal";
import { mapOrderToLabelData } from "@/lib/niimbot/mapOrder";
import { generateNiimbotXlsx, buildXlsxFilename } from "@/lib/niimbot/xlsx";
import { downloadBlob } from "@/lib/niimbot/transfer";

type Tab = "stats" | "products" | "orders" | "users" | "categories" | "brands" | "delivery" | "payments" | "banner" | "collections" | "chatbot" | "analytics" | "diagnostics";

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, loading: authLoading, authError } = useAuth();
  const hasAdminAccess = isAdmin || isModerator;
  const [tab, setTab] = useState<Tab>("stats");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<any[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<any[]>([]);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  // Promo banner form state
  const [bannerForm, setBannerForm] = useState({ title: "", subtitle: "", button_text: "Бүтээгдхүүн үзэх", button_link: "/shop", banner_image: "" });
  const [editBannerId, setEditBannerId] = useState<string | null>(null);
  const bannerImageFileRef = useRef<HTMLInputElement>(null);

  // Category/Brand form state
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [editBrandId, setEditBrandId] = useState<string | null>(null);
  const brandLogoFileRef = useRef<HTMLInputElement>(null);

  // Delivery form state
  const [deliveryForm, setDeliveryForm] = useState({
    name: "", description: "", price: 0,
    estimated_days_min: 1, estimated_days_max: 3, is_active: true,
    address: "", phone: "", payment_terms: "",
  });
  const [editDeliveryId, setEditDeliveryId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Payment provider form state
  const [ppForm, setPpForm] = useState({ name: "", logo_url: "", color: "bg-blue-500", icon: "💳", description: "", is_active: true });
  const [editPpId, setEditPpId] = useState<string | null>(null);
  const ppLogoFileRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: 0, original_price: 0,
    image_url: "", category: "general", discount: 0,
    is_new: false, is_on_sale: false, is_bogo: false, is_active: true,
    product_code: "", slug: "", specifications: [] as { key: string; value: string }[],
    detail_media: [] as { type: "image" | "video"; url: string; caption: string; thumbnail?: string }[],
    brand_id: "",
    colors: [] as { name: string; image: string; sku: string }[],
    sizes: [] as string[],
  });
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");

  // Detail media file input
  const detailMediaFileRef = useRef<HTMLInputElement>(null);
  const detailVideoFileRef = useRef<HTMLInputElement>(null);

  const handleDetailMediaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newMedia: { type: "image" | "video"; url: string; caption: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/") && !/\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif|tiff?)$/i.test(file.name)) continue;
      if (file.size > 5 * 1024 * 1024) continue;
      try {
        const webpUrl = await optimizeImage(file);
        newMedia.push({ type: "image", url: webpUrl, caption: "" });
      } catch {
        console.error("Image optimization failed, skipping");
      }
    }
    if (newMedia.length > 0) {
      setForm((prev) => ({ ...prev, detail_media: [...prev.detail_media, ...newMedia] }));
      toast.success(`${newMedia.length} зураг WebP болгож нэмэгдлээ`);
    }
    if (detailMediaFileRef.current) detailMediaFileRef.current.value = "";
  };

  const handleDetailVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newMedia: { type: "image" | "video"; url: string; caption: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("video/")) continue;
      if (file.size > 50 * 1024 * 1024) { toast.error("Видео 50MB-ээс бага байх ёстой"); continue; }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = (ev) => resolve(ev.target?.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      newMedia.push({ type: "video", url: dataUrl, caption: "" });
    }
    if (newMedia.length > 0) {
      setForm((prev) => ({ ...prev, detail_media: [...prev.detail_media, ...newMedia] }));
      toast.success(`${newMedia.length} бичлэг нэмэгдлээ`);
    }
    if (detailVideoFileRef.current) detailVideoFileRef.current.value = "";
  };


  const [extraImages, setExtraImages] = useState<string[]>([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [orderSearchPhone, setOrderSearchPhone] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [showXlsxHelp, setShowXlsxHelp] = useState(false);

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
    try {
      const webpUrl = await optimizeImage(file);
      setForm((prev) => ({ ...prev, image_url: webpUrl }));
      toast.success("Зураг WebP (1200px) болгож оруулагдлаа");
    } catch {
      toast.error("Зураг оновчлоход алдаа гарлаа");
    } finally {
      setUploading(false);
    }
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
      try {
        const webpUrl = await optimizeImage(file);
        newImages.push(webpUrl);
      } catch {
        hasError = true;
      }
    }
    if (hasError) toast.error("Зарим зураг оруулж чадсангүй");
    if (newImages.length > 0) {
      setExtraImages((prev) => [...prev, ...newImages]);
      toast.success(`${newImages.length} зураг WebP болгож нэмэгдлээ`);
    }
    if (extraFileInputRef.current) extraFileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!authLoading && !hasAdminAccess && !authError) {
      toast.error("Админ эрхгүй байна");
      navigate("/");
    }
  }, [isAdmin, authLoading, authError]);

  const loadAdminData = () => {
    fetchProducts();
    fetchOrders();
    fetchUsers();
    fetchCategories();
    fetchBrands();
    fetchDeliveryOptions();
    fetchPaymentProviders();
    fetchPromoBanners();
  };

  useEffect(() => {
    if (authLoading || !hasAdminAccess) return;
    loadAdminData();
  }, [authLoading, isAdmin]);

  const fetchPromoBanners = async () => {
    try {
      const { data } = await supabase.from("promo_banners").select("*").order("position");
      setPromoBanners(data || []);
    } catch { setPromoBanners([]); }
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.title.trim()) { toast.error("Гарчиг оруулна уу"); return; }
    const payload = { title: bannerForm.title, subtitle: bannerForm.subtitle || "", button_text: bannerForm.button_text || "Бүтээгдхүүн үзэх", button_link: bannerForm.button_link || "/shop", banner_image: bannerForm.banner_image || null };
    if (editBannerId) {
      const { error } = await supabase.from("promo_banners").update(payload).eq("id", editBannerId);
      if (error) toast.error(error.message);
      else toast.success("Баннер шинэчлэгдлээ");
    } else {
      const { error } = await supabase.from("promo_banners").insert({ ...payload, position: promoBanners.length } as any);
      if (error) toast.error(error.message);
      else toast.success("Баннер нэмэгдлээ");
    }
    setBannerForm({ title: "", subtitle: "", button_text: "Бүтээгдхүүн үзэх", button_link: "/shop", banner_image: "" }); setEditBannerId(null);
    fetchPromoBanners();
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Зөвхөн зураг оруулна уу"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Зураг 5MB-ээс бага байх ёстой"); return; }
    try {
      const webpUrl = await optimizeImage(file);
      setBannerForm(f => ({ ...f, banner_image: webpUrl }));
      toast.success("Баннер зураг оруулагдлаа");
    } catch { toast.error("Зураг оновчлоход алдаа"); }
    if (bannerImageFileRef.current) bannerImageFileRef.current.value = "";
  };

  const handleDeleteBanner = async (id: string) => {
    const { error } = await supabase.from("promo_banners").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Баннер устгагдлаа"); fetchPromoBanners(); }
  };

  const toggleBannerActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("promo_banners").update({ is_active: !currentActive }).eq("id", id);
    if (error) toast.error(error.message);
    else fetchPromoBanners();
  };

  const fetchPaymentProviders = async () => {
    try {
      const { data } = await supabase.from("payment_providers").select("*").order("position");
      setPaymentProviders(data || []);
    } catch { setPaymentProviders([]); }
  };

  const handleSavePaymentProvider = async () => {
    if (!ppForm.name.trim()) { toast.error("Нэр оруулна уу"); return; }
    const payload = { name: ppForm.name, logo_url: ppForm.logo_url || null, color: ppForm.color, icon: ppForm.icon || "💳", description: ppForm.description || null, is_active: ppForm.is_active };
    if (editPpId) {
      const { error } = await supabase.from("payment_providers").update(payload).eq("id", editPpId);
      if (error) toast.error(error.message);
      else toast.success("Төлбөрийн суваг шинэчлэгдлээ");
    } else {
      const { error } = await supabase.from("payment_providers").insert({ ...payload, position: paymentProviders.length } as any);
      if (error) toast.error(error.message);
      else toast.success("Төлбөрийн суваг нэмэгдлээ");
    }
    setPpForm({ name: "", logo_url: "", color: "bg-blue-500", icon: "💳", description: "", is_active: true }); setEditPpId(null);
    fetchPaymentProviders();
  };

  const handleDeletePaymentProvider = async (id: string) => {
    const { error } = await supabase.from("payment_providers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Төлбөрийн суваг устгагдлаа"); fetchPaymentProviders(); }
  };

  const handlePpLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Зөвхөн зураг оруулна уу"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Зураг 5MB-ээс бага байх ёстой"); return; }
    try {
      const webpUrl = await optimizeImage(file);
      setPpForm(f => ({ ...f, logo_url: webpUrl }));
      toast.success("Лого оруулагдлаа");
    } catch { toast.error("Зураг оновчлоход алдаа"); }
    if (ppLogoFileRef.current) ppLogoFileRef.current.value = "";
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("id, name, price, original_price, image_url, thumbnail_url, category, sales, is_new, is_on_sale, is_bogo, is_active, discount, product_code, slug, brand_id, created_at").order("created_at", { ascending: false });
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
    const { error } = await supabase.from("orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
    if (error) {
      console.error("Order status update error:", error);
      toast.error("Төлөв өөрчлөхөд алдаа гарлаа: " + error.message);
    } else {
      toast.success(`Захиалгын төлөв "${statusLabels[newStatus]}" болж өөрчлөгдлөө`);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));

      // Notify delivery system on cancellation
      if (newStatus === "cancelled") {
        const order = orders.find(o => o.id === orderId);
        if (order?.delivery_order_id) {
          supabase.functions.invoke("notify-delivery-status", {
            body: { order_id: orderId, fulfillment_status: "cancelled", note: "Easyshop дээр цуцлагдсан" },
          }).catch(console.error);
        }
      }
      // Notify delivery system when payment confirmed
      if (newStatus === "confirmed") {
        const order = orders.find(o => o.id === orderId);
        if (order?.delivery_order_id) {
          supabase.functions.invoke("notify-delivery-status", {
            body: { order_id: orderId, payment_status: "paid" },
          }).catch(console.error);
        }
      }
    }
  };

  const [sendingDelivery, setSendingDelivery] = useState<string | null>(null);

  const sendToDelivery = async (orderId: string) => {
    setSendingDelivery(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("send-to-delivery", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Хүргэлтэнд илгээгдлээ: ${data.delivery_order_id || ""}`);
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, delivery_order_id: data.delivery_order_id, delivery_status: "processing" } : o));
      } else {
        toast.error("Хүргэлтэнд илгээхэд алдаа: " + (data?.error || "Unknown"));
      }
    } catch (e: any) {
      toast.error("Хүргэлтэнд илгээхэд алдаа: " + e.message);
    } finally {
      setSendingDelivery(null);
    }
  };

  const [deleteOrderTarget, setDeleteOrderTarget] = useState<{ id: string } | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingOrder(true);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      toast.error("Захиалга устгахад алдаа гарлаа: " + error.message);
    } else {
      toast.success("Захиалга устгагдлаа");
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
    setDeleteOrderTarget(null);
    setDeletingOrder(false);
  };

  const paymentMethodLabels: Record<string, { label: string; color: string }> = {
    storepay: { label: "Storepay", color: "bg-purple-500/10 text-purple-600" },
    qpay: { label: "QPay", color: "bg-blue-500/10 text-blue-600" },
    cash: { label: "Бэлнээр", color: "bg-amber-500/10 text-amber-600" },
  };

  const handleDeliveryPhotoUpload = async (orderId: string, field: "delivery_pickup_photo" | "delivery_completed_photo", file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Зөвхөн зураг оруулна уу"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Зураг 5MB-ээс бага байх ёстой"); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = (ev) => resolve(ev.target?.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const { error } = await supabase.from("orders").update({ [field]: dataUrl }).eq("id", orderId);
    if (error) { toast.error("Зураг хадгалахад алдаа гарлаа"); return; }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, [field]: dataUrl } : o));
    toast.success("Зураг амжилттай хадгалагдлаа");
  };

  const statusLabels: Record<string, string> = {
    pending: "Хүлээгдэж буй",
    confirmed: "Төлбөр орсон",
    phone_confirmed: "Утсаар баталгаажуулсан",
    preparing: "Бэлдэж байна",
    delivering: "Хүргэлтэнд гарсан",
    completed: "Дууссан",
    cancelled: "Цуцлагдсан",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    confirmed: "bg-emerald-500/10 text-emerald-600",
    phone_confirmed: "bg-teal-500/10 text-teal-600",
    preparing: "bg-blue-500/10 text-blue-600",
    delivering: "bg-violet-500/10 text-violet-600",
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

  // Delivery Options CRUD
  const fetchDeliveryOptions = async () => {
    try {
      const { data } = await supabase.from("delivery_options").select("*").order("position");
      setDeliveryOptions(data || []);
    } catch { setDeliveryOptions([]); }
  };

  const resetDeliveryForm = () => {
    setDeliveryForm({ name: "", description: "", price: 0, estimated_days_min: 1, estimated_days_max: 3, is_active: true, address: "", phone: "", payment_terms: "" });
    setEditDeliveryId(null);
  };

  const handleSaveDelivery = async () => {
    if (!deliveryForm.name.trim()) { toast.error("Хүргэлтийн нэр оруулна уу"); return; }
    const payload = {
      name: deliveryForm.name,
      description: deliveryForm.description || null,
      price: deliveryForm.price,
      estimated_days_min: deliveryForm.estimated_days_min,
      estimated_days_max: deliveryForm.estimated_days_max,
      is_active: deliveryForm.is_active,
      address: deliveryForm.address || null,
      phone: deliveryForm.phone || null,
      payment_terms: deliveryForm.payment_terms || null,
    };
    if (editDeliveryId) {
      const { error } = await supabase.from("delivery_options").update(payload).eq("id", editDeliveryId);
      if (error) toast.error(error.message);
      else toast.success("Хүргэлт шинэчлэгдлээ");
    } else {
      const { error } = await supabase.from("delivery_options").insert({ ...payload, position: deliveryOptions.length } as any);
      if (error) toast.error(error.message);
      else toast.success("Хүргэлт нэмэгдлээ");
    }
    resetDeliveryForm();
    fetchDeliveryOptions();
  };

  const handleDeleteDelivery = async (id: string) => {
    const { error } = await supabase.from("delivery_options").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Хүргэлт устгагдлаа"); fetchDeliveryOptions(); }
  };

  const toggleDeliveryActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("delivery_options").update({ is_active: !currentActive }).eq("id", id);
    if (error) toast.error(error.message);
    else { fetchDeliveryOptions(); }
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
    setForm({ name: "", description: "", price: 0, original_price: 0, image_url: "", category: "general", discount: 0, is_new: false, is_on_sale: false, is_bogo: false, is_active: true, product_code: "", slug: "", specifications: [], detail_media: [], brand_id: "", colors: [], sizes: [] });
    setNewColor(""); setNewSize("");
    setEditId(null);
    setShowForm(false);
    setExtraImages([]);
  };

  const handleSaveProduct = async () => {
    if (!form.name.trim()) { toast.error("Барааны нэр заавал бөглөнө"); return; }
    if (!form.price || form.price <= 0) { toast.error("Зөв үнэ оруулна уу"); return; }

    // Check duplicate name
    {
      let q = supabase.from("products").select("id").eq("name", form.name.trim());
      if (editId) q = q.neq("id", editId);
      const { data } = await q.limit(1);
      if (data && data.length > 0) { toast.error("Ижил нэртэй бараа бүртгэлтэй байна"); return; }
    }

    // Check duplicate product_code
    if (form.product_code && form.product_code.trim()) {
      let q = supabase.from("products").select("id").eq("product_code", form.product_code.trim());
      if (editId) q = q.neq("id", editId);
      const { data } = await q.limit(1);
      if (data && data.length > 0) { toast.error("Ижил бүтээгдэхүүний код бүртгэлтэй байна"); return; }
    }
    setLoading(true);
    // Generate thumbnail from main image
    let thumbnailUrl: string | null = null;
    if (form.image_url && form.image_url.startsWith("data:")) {
      try {
        thumbnailUrl = await generateThumbnail(form.image_url);
      } catch (e) {
        console.error("Thumbnail generation failed", e);
      }
    }

    const payload = {
      name: form.name, description: form.description, price: form.price,
      original_price: form.original_price, image_url: form.image_url,
      thumbnail_url: thumbnailUrl,
      category: form.category, discount: form.discount,
      is_new: form.is_new, is_on_sale: form.is_on_sale, is_bogo: form.is_bogo, is_active: form.is_active,
      product_code: form.product_code || null,
      slug: form.slug.trim() || cyrillicToLatinSlug(form.name),
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
    // Fetch heavy data (colors, sizes, specifications, detail_media, description) only when editing
    const { data: fullProduct } = await supabase
      .from("products")
      .select("description, colors, sizes, specifications, detail_media")
      .eq("id", p.id)
      .single();

    const full: any = fullProduct || {};
    const specs = Array.isArray(full.specifications) ? full.specifications : [];
    const media = Array.isArray(full.detail_media) ? full.detail_media : [];
    setForm({
      name: p.name, description: full.description || "", price: p.price,
      original_price: p.original_price || 0, image_url: p.image_url || "",
      category: p.category, discount: p.discount || 0,
      is_new: p.is_new, is_on_sale: p.is_on_sale, is_bogo: p.is_bogo || false, is_active: p.is_active !== false,
      product_code: p.product_code || "",
      slug: p.slug || "",
      specifications: specs.map((s: any) => ({ key: s.key || "", value: s.value || "" })),
      detail_media: media.map((m: any) => ({ type: m.type || "image", url: m.url || "", caption: m.caption || "", thumbnail: m.thumbnail || "" })),
      brand_id: p.brand_id || "",
      colors: Array.isArray(full.colors) ? full.colors.map((c: any) => typeof c === 'string' ? { name: c, image: '', sku: '' } : { name: c.name || '', image: c.image || '', sku: c.sku || '' }) : [],
      sizes: Array.isArray(full.sizes) ? full.sizes : [],
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

  const handleDuplicateProduct = async (p: any) => {
    // Fetch heavy data so duplicate carries everything
    const { data: fullProduct } = await supabase
      .from("products")
      .select("description, colors, sizes, specifications, detail_media")
      .eq("id", p.id)
      .single();

    const full: any = fullProduct || {};
    const specs = Array.isArray(full.specifications) ? full.specifications : [];
    const media = Array.isArray(full.detail_media) ? full.detail_media : [];
    setForm({
      name: `${p.name} (хуулбар)`,
      description: full.description || "",
      price: p.price,
      original_price: p.original_price || 0,
      image_url: p.image_url || "",
      category: p.category,
      discount: p.discount || 0,
      is_new: p.is_new,
      is_on_sale: p.is_on_sale,
      is_bogo: p.is_bogo || false,
      is_active: p.is_active !== false,
      product_code: "", // clear SKU — must be unique
      slug: "",          // auto-generated on save
      specifications: specs.map((s: any) => ({ key: s.key || "", value: s.value || "" })),
      detail_media: media.map((m: any) => ({ type: m.type || "image", url: m.url || "", caption: m.caption || "", thumbnail: m.thumbnail || "" })),
      brand_id: p.brand_id || "",
      colors: Array.isArray(full.colors) ? full.colors.map((c: any) => typeof c === 'string' ? { name: c, image: '', sku: '' } : { name: c.name || '', image: c.image || '', sku: c.sku || '' }) : [],
      sizes: Array.isArray(full.sizes) ? full.sizes : [],
    });
    setEditId(null); // important: create new, don't update
    setShowForm(true);
    // Copy extra images too
    const { data } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", p.id)
      .order("position");
    setExtraImages((data || []).map((r: any) => r.image_url));
    toast.success("Бараа хуулагдлаа. SKU-г шалгаад хадгална уу.");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(q) || (p.product_code && p.product_code.toLowerCase().includes(q));
    const matchCategory = filterCategory === "all" || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const categories = [...new Set(products.map((p) => p.category))];

  const moderatorTabs: Tab[] = ["stats", "delivery", "orders"];

  const allSidebarItems: { id: Tab; label: string; icon: any }[] = [
    { id: "stats", label: "Статистик", icon: BarChart3 },
    { id: "products", label: "Бараа", icon: Package },
    { id: "categories", label: "Ангилал", icon: Layers },
    { id: "brands", label: "Брэнд", icon: Tag },
    { id: "delivery", label: "Хүргэлт", icon: Truck },
    { id: "payments", label: "Төлбөр", icon: CreditCard },
    { id: "banner", label: "Баннер", icon: Megaphone },
    
    { id: "orders", label: "Захиалга", icon: ShoppingBag },
    { id: "collections", label: "Багц линк", icon: Link2 },
    { id: "chatbot", label: "AI Чатбот", icon: MessageCircle },
    { id: "users", label: "Хэрэглэгч", icon: Users },
    { id: "analytics", label: "Хандалт", icon: Globe },
    { id: "diagnostics", label: "Оношлогоо", icon: AlertTriangle },
  ];

  const sidebarItems = isAdmin
    ? allSidebarItems
    : allSidebarItems.filter(item => moderatorTabs.includes(item.id));

  const paidOrders = orders.filter((o: any) => o.status === 'confirmed' || o.status === 'completed');
  const totalRevenue = paidOrders.reduce((s: number, o: any) => s + o.total, 0);

  // Өнөөдрийн захиалга
  const todayOrders = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return orders.filter((o: any) => o.created_at?.startsWith(today));
  }, [orders]);

  const todayRevenue = todayOrders.filter((o: any) => o.status === 'confirmed' || o.status === 'completed').reduce((s: number, o: any) => s + o.total, 0);

  // Энэ долоо хоногийн орлого
  const weekRevenue = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    return orders
      .filter((o: any) => (o.status === 'confirmed' || o.status === 'completed') && new Date(o.created_at) >= weekAgo)
      .reduce((s: number, o: any) => s + o.total, 0);
  }, [orders]);

  // Хамгийн их борлуулалттай бараа (top 5)
  const topProducts = useMemo(() => {
    const salesMap: Record<string, { name: string; count: number; revenue: number; image_url: string }> = {};
    paidOrders.forEach((o: any) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        const id = item.id || item.product_id || item.name;
        if (!id) return;
        if (!salesMap[id]) {
          salesMap[id] = { name: item.name || id, count: 0, revenue: 0, image_url: item.image_url || "" };
        }
        salesMap[id].count += (item.quantity || 1);
        salesMap[id].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    return Object.values(salesMap).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [paidOrders]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    paidOrders.forEach((o: any) => {
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
  }, [paidOrders]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    products.forEach((p: any) => { cats[p.category] = (cats[p.category] || 0) + 1; });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [products]);

  const orderStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    orders.forEach((o: any) => { statuses[o.status] = (statuses[o.status] || 0) + 1; });
    const labels: Record<string, string> = { pending: "Хүлээгдэж буй", confirmed: "Төлбөр орсон", phone_confirmed: "Утсаар баталгаажуулсан", preparing: "Бэлдэж байна", delivering: "Хүргэлтэнд гарсан", completed: "Дууссан", cancelled: "Цуцлагдсан" };
    return Object.entries(statuses).map(([key, value]) => ({ name: labels[key] || key, value }));
  }, [orders]);

  const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Уншиж байна...</div>;

  if (authError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
      <AlertTriangle className="w-12 h-12 text-destructive" />
      <h2 className="text-lg font-semibold">Сүлжээний алдаа</h2>
      <p className="text-muted-foreground text-sm max-w-sm">Backend-тэй холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Дахин оролдох</button>
      <button onClick={() => navigate("/")} className="text-sm text-muted-foreground underline">Нүүр хуудас руу буцах</button>
    </div>
  );

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

      {/* Delete Order Confirmation Dialog */}
      <AlertDialog open={!!deleteOrderTarget} onOpenChange={(open) => !open && setDeleteOrderTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Захиалга устгах
            </AlertDialogTitle>
            <AlertDialogDescription>
              Цуцлагдсан захиалга <span className="font-semibold text-foreground">#{deleteOrderTarget?.id.slice(0, 8)}</span>-г устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOrder}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOrderTarget && handleDeleteOrder(deleteOrderTarget.id)}
              disabled={deletingOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingOrder ? "Устгаж байна..." : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <aside className="hidden md:flex md:flex-col md:w-64 bg-card border-r border-border min-h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm"><span className="font-bold">Easy</span><span className="font-light">Shop</span></h1>
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
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-border">
          <button onClick={() => navigate("/")} className="p-2 rounded-full bg-secondary shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-bold flex-1">Админ</h1>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full">{sidebarItems.find(s => s.id === tab)?.label}</span>
          </div>
        </header>
        <div className="sticky top-[52px] z-40 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex overflow-x-auto no-scrollbar gap-1 px-3 py-2">
            {sidebarItems.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    active 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground bg-secondary/60 active:bg-secondary"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {t.id === "orders" && orders.length > 0 && (
                    <span className={`text-[9px] min-w-[16px] h-4 flex items-center justify-center rounded-full ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>
                      {orders.filter(o => o.status === 'pending').length || ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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
              {tab === "delivery" && `Нийт ${deliveryOptions.length} хүргэлтийн сонголт`}
              {tab === "banner" && `Баннер болон ${paymentProviders.length} лого`}
              {tab === "payments" && `Нийт ${paymentProviders.length} төлбөрийн суваг`}
              
              {tab === "analytics" && "Вэб сайтын хандалтын мэдээлэл"}
              {tab === "collections" && "Барааны багц үүсгэж линкээр хуваалцах"}
              {tab === "diagnostics" && "Зургийн оношлогоо & Cloud зардал"}
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: "Нийт бараа", value: products.length, icon: Package, color: "bg-blue-500/10 text-blue-600", tab: "products" as Tab },
                  { label: "Нийт захиалга", value: orders.length, icon: ShoppingBag, color: "bg-green-500/10 text-green-600", tab: "orders" as Tab },
                  { label: "Нийт хэрэглэгч", value: users.length, icon: Users, color: "bg-purple-500/10 text-purple-600", tab: "users" as Tab },
                  { label: "Нийт орлого", value: formatPrice(totalRevenue), icon: BarChart3, color: "bg-amber-500/10 text-amber-600", tab: "orders" as Tab },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} onClick={() => setTab(stat.tab)} className="bg-card rounded-2xl p-4 md:p-6 border border-border cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.98]">
                      <div className={`h-8 w-8 md:h-10 md:w-10 rounded-xl ${stat.color} flex items-center justify-center mb-3 md:mb-4`}>
                        <Icon className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                      <p className="text-lg md:text-2xl font-extrabold">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Өнөөдөр & Долоо хоног */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                <div onClick={() => setTab("orders")} className="bg-card rounded-2xl p-4 md:p-5 border border-border cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.98]">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Өнөөдрийн захиалга</p>
                  <p className="text-lg md:text-2xl font-extrabold">{todayOrders.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Орлого: {formatPrice(todayRevenue)}</p>
                </div>
                <div onClick={() => setTab("orders")} className="bg-card rounded-2xl p-4 md:p-5 border border-border cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.98]">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">7 хоногийн орлого</p>
                  <p className="text-lg md:text-2xl font-extrabold">{formatPrice(weekRevenue)}</p>
                </div>
                <div onClick={() => setTab("orders")} className="bg-card rounded-2xl p-4 md:p-5 border border-border col-span-2 lg:col-span-1 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.98]">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Дундаж захиалга</p>
                  <p className="text-lg md:text-2xl font-extrabold">{paidOrders.length > 0 ? formatPrice(Math.round(totalRevenue / paidOrders.length)) : "₮0"}</p>
                </div>
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

                {/* Хамгийн их борлуулалттай бараа */}
                <div className="bg-card rounded-2xl p-5 border border-border">
                  <h3 className="text-sm font-bold mb-4">Шилдэг бараа (борлуулалтаар)</h3>
                  <div className="space-y-3">
                    {topProducts.length > 0 ? topProducts.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-9 w-9 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.count} ширхэг · {formatPrice(p.revenue)}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Мэдээлэл байхгүй</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
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
                  <div className="bg-card rounded-2xl p-5 border border-border">
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
                         accept="image/*,.png,.jpg,.jpeg,.jfif,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff,.ico,.dng,.raw,.cr2,.nef,.psd"
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
                         accept="image/*,.png,.jpg,.jpeg,.jfif,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff,.ico,.dng,.raw,.cr2,.nef,.psd"
                        multiple
                        className="hidden"
                        onChange={handleExtraImageUpload}
                      />
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Бүтээгдэхүүний код</label>
                      <input placeholder="SKU-001" value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Линк (slug)</label>
                      <div className="flex items-center gap-0">
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-3 rounded-l-xl border-r border-border">/product/</span>
                        <input placeholder="автоматаар үүснэ" value={form.slug} onChange={(e) => setForm({ ...form, slug: cyrillicToLatinSlug(e.target.value) })}
                          className="w-full rounded-r-xl bg-secondary px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Хоосон үлдээвэл нэрнээс автомат үүснэ</p>
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
                          <div className="h-14 w-14 rounded-lg bg-secondary overflow-hidden shrink-0 cursor-pointer relative group"
                            onClick={() => {
                              if (media.type !== "video") return;
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff";
                              input.onchange = async (ev: any) => {
                                const file = ev.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) { toast.error("5MB-ээс бага байх ёстой"); return; }
                                try {
                                  const webpUrl = await optimizeImage(file);
                                  const dm = [...form.detail_media];
                                  dm[idx] = { ...dm[idx], thumbnail: webpUrl };
                                  setForm({ ...form, detail_media: dm });
                                } catch { toast.error("Зураг оновчлоход алдаа"); }
                              };
                              input.click();
                            }}
                            title={media.type === "video" ? "Thumbnail зураг оруулах" : ""}
                          >
                            {media.type === "image" ? (
                              <img src={media.url} alt="" className="h-full w-full object-cover" />
                            ) : media.thumbnail ? (
                              <img src={media.thumbnail} alt="thumbnail" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Eye className="h-5 w-5" />
                              </div>
                            )}
                            {media.type === "video" && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-white" />
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
                              <input placeholder={media.type === "video" ? "YouTube/Facebook/видео URL" : "Зураг URL"} value={media.url.startsWith("data:") ? (media.type === "video" ? "🎬 Бичлэг оруулсан" : "📷 Зураг оруулсан") : media.url}
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
                      <div className="flex flex-wrap gap-2">
                        <button type="button"
                          onClick={() => detailMediaFileRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1">
                          <ImageIcon className="h-3.5 w-3.5" /> Зураг оруулах
                        </button>
                        <button type="button"
                          onClick={() => detailVideoFileRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1">
                          <Video className="h-3.5 w-3.5" /> Бичлэг оруулах
                        </button>
                        <button type="button"
                          onClick={() => setForm({ ...form, detail_media: [...form.detail_media, { type: "video", url: "", caption: "", thumbnail: "" }] })}
                          className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1">
                          <Plus className="h-3.5 w-3.5" /> Бичлэг URL нэмэх (YouTube, Facebook)
                        </button>
                      </div>
                      <input ref={detailMediaFileRef} type="file" accept="image/*,.png,.jpg,.jpeg,.jfif,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff,.ico,.dng,.raw,.cr2,.nef,.psd" multiple className="hidden" onChange={handleDetailMediaImageUpload} />
                      <input ref={detailVideoFileRef} type="file" accept="video/*,.mp4,.mov,.avi,.webm,.mkv" multiple className="hidden" onChange={handleDetailVideoUpload} />
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-2 block">Өнгө ({form.colors.length})</label>
                    <div className="space-y-2 mb-2">
                      {form.colors.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                          <div
                            className="h-12 w-12 rounded-lg bg-secondary border-2 border-dashed border-border overflow-hidden shrink-0 cursor-pointer hover:border-primary/40 transition-colors flex items-center justify-center"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff";
                              input.onchange = async (e: any) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) { toast.error("5MB-ээс бага байх ёстой"); return; }
                                try {
                                  const webpUrl = await optimizeImage(file);
                                  const updated = [...form.colors];
                                  updated[idx] = { ...updated[idx], image: webpUrl };
                                  setForm({ ...form, colors: updated });
                                } catch { toast.error("Зураг оновчлоход алдаа"); }
                              };
                              input.click();
                            }}
                          >
                            {color.image ? (
                              <img src={color.image} alt="" className="h-full w-full object-cover rounded-lg" />
                            ) : (
                              <Upload className="h-4 w-4 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="flex-1 flex flex-col gap-1.5">
                            <input placeholder="Өнгөний нэр" value={color.name}
                              onChange={(e) => {
                                const updated = [...form.colors];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setForm({ ...form, colors: updated });
                              }}
                              className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20" />
                            <input placeholder="SKU код (жишээ: ES-001-BLK)" value={color.sku || ""}
                              onChange={(e) => {
                                const updated = [...form.colors];
                                updated[idx] = { ...updated[idx], sku: e.target.value };
                                setForm({ ...form, colors: updated });
                              }}
                              className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 font-mono" />
                          </div>
                          <button type="button" onClick={() => setForm({ ...form, colors: form.colors.filter((_, i) => i !== idx) })}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button"
                      onClick={() => setForm({ ...form, colors: [...form.colors, { name: "", image: "", sku: "" }] })}
                      className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1">
                      <Plus className="h-3.5 w-3.5" /> Өнгө нэмэх
                    </button>
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


                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.is_new} onChange={(e) => setForm({ ...form, is_new: e.target.checked })} className="rounded" />
                      Шинэ бараа
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.is_on_sale} onChange={(e) => setForm({ ...form, is_on_sale: e.target.checked })} className="rounded" />
                      Хямдралтай
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.is_bogo} onChange={(e) => setForm({ ...form, is_bogo: e.target.checked })} className="rounded" />
                      1+1 Үнэгүй
                    </label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded accent-primary" />
                      <span className={form.is_active ? "text-foreground font-medium" : "text-destructive font-medium"}>
                        {form.is_active ? "✅ Идэвхтэй" : "⛔ Идэвхгүй (дэлгүүрт харагдахгүй)"}
                      </span>
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
                        <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${p.is_active === false ? "opacity-50" : ""}`}>
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
                                {p.is_active === false && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">Идэвхгүй</span>}
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
                              <button onClick={() => navigate(`/product/${p.slug || p.id}`)}
                                className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Харах">
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => handleEditProduct(p)}
                                className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Засах">
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => handleDuplicateProduct(p)}
                                className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Хуулбарлах">
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <div key={p.id} className={`flex items-center gap-3 bg-card rounded-xl p-3 border border-border ${p.is_active === false ? "opacity-50" : ""}`}>
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
                    <button onClick={() => handleEditProduct(p)} className="p-2 rounded-lg bg-secondary" title="Засах"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDuplicateProduct(p)} className="p-2 rounded-lg bg-secondary" title="Хуулбарлах"><Copy className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleteTarget({ id: p.id, name: p.name })} className="p-2 rounded-lg bg-destructive/10 text-destructive" title="Устгах"><Trash2 className="h-3.5 w-3.5" /></button>
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
            <div className="space-y-3">
              {/* Phone search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Утас / захиалгын дугаараар хайх..."
                  value={orderSearchPhone}
                  onChange={(e) => setOrderSearchPhone(e.target.value)}
                  className="w-full rounded-xl bg-secondary pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {orderSearchPhone && (
                  <button onClick={() => setOrderSearchPhone("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              {orderSearchPhone && (
                <p className="text-xs text-muted-foreground">
                  {orders.filter(o => o.phone?.includes(orderSearchPhone) || o.order_ref?.toLowerCase().includes(orderSearchPhone.toLowerCase())).length} захиалга олдлоо
                </p>
              )}

              {(() => {
                const filteredOrders = orderSearchPhone
                  ? orders.filter(o => o.phone?.includes(orderSearchPhone) || o.order_ref?.toLowerCase().includes(orderSearchPhone.toLowerCase()))
                  : orders;
                const filteredIds = filteredOrders.map((o: any) => o.id);
                const allChecked = filteredIds.length > 0 && filteredIds.every((id: string) => bulkSelected.has(id));
                const someChecked = filteredIds.some((id: string) => bulkSelected.has(id));

                const toggleAll = () => {
                  setBulkSelected((prev) => {
                    const next = new Set(prev);
                    if (allChecked) {
                      filteredIds.forEach((id: string) => next.delete(id));
                    } else {
                      filteredIds.forEach((id: string) => next.add(id));
                    }
                    return next;
                  });
                };

                const handleBulkXlsx = async () => {
                  const chosen = orders.filter((o: any) => bulkSelected.has(o.id));
                  if (chosen.length === 0) {
                    toast.error("Захиалга сонгоно уу");
                    return;
                  }
                  try {
                    const rows = chosen.map(mapOrderToLabelData);
                    const blob = generateNiimbotXlsx(rows);
                    downloadBlob(blob, buildXlsxFilename(rows.length));
                    toast.success("Excel файл татагдлаа");
                    setShowXlsxHelp(true);
                  } catch (e) {
                    console.error(e);
                    toast.error("Excel үүсгэхэд алдаа гарлаа");
                  }
                };

                return (
                  <>
                    {/* Niimbot bulk action bar */}
                    <div className="bg-card rounded-xl border border-border p-3 md:p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={allChecked ? true : someChecked ? "indeterminate" : false}
                            onCheckedChange={toggleAll}
                            id="bulk-select-all"
                          />
                          <label htmlFor="bulk-select-all" className="text-sm font-medium cursor-pointer select-none">
                            Бүгдийг сонгох
                          </label>
                          <span className="text-xs text-muted-foreground">
                            {bulkSelected.size} сонгосон
                          </span>
                        </div>
                        <NiimbotBulkXlsxButton onExport={handleBulkXlsx} count={bulkSelected.size} />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Niimbot аппын <span className="font-semibold text-foreground">Import Data Source</span> функцэд ашиглана. Олон захиалгыг нэг загвар руу импортолж бөөнөөр хэвлэнэ.
                      </p>
                    </div>

                    {filteredOrders.map((o: any) => {
                      const delOpt = deliveryOptions.find((d: any) => d.id === o.delivery_option_id);
                      const isExpanded = expandedOrderId === o.id;
                      const orderItems = Array.isArray(o.items) ? o.items : [];
                      const isChecked = bulkSelected.has(o.id);
                      return (
                        <div key={o.id} className="bg-card rounded-xl border border-border overflow-hidden">
                          {/* Order header - clickable */}
                          <div className="flex items-stretch">
                            <div className="flex items-center pl-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(v) => {
                                  setBulkSelected((prev) => {
                                    const next = new Set(prev);
                                    if (v) next.add(o.id);
                                    else next.delete(o.id);
                                    return next;
                                  });
                                }}
                              />
                            </div>
                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                              className="flex-1 flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
                            >

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold">#{o.id.slice(0, 8)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[o.status] || "bg-secondary text-muted-foreground"}`}>
                            {statusLabels[o.status] || o.status}
                          </span>
                          {(() => {
                            const pm = paymentMethodLabels[(o.payment_method || "cash").toLowerCase()];
                            return pm ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pm.color}`}>
                                {pm.label}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                {o.payment_method || "Бэлнээр"}
                              </span>
                            );
                          })()}
                          {o.payment_status === "confirmed" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                              💰 Төлбөр орсон
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{formatPrice(o.total)}</span>
                          <span>{o.phone || "—"}</span>
                          <span>{new Date(o.created_at).toLocaleDateString("mn-MN")} {new Date(o.created_at).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}</span>
                          {o.is_guest && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">Зочин{o.guest_name ? `: ${o.guest_name}` : ""}</span>}
                        </div>
                        {delOpt && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Truck className="h-3 w-3 text-primary" />
                            <span className="text-[10px] text-muted-foreground">
                              {delOpt.name} · {o.delivery_fee > 0 ? formatPrice(o.delivery_fee) : "Үнэгүй"}
                            </span>
                          </div>
                        )}
                        {o.delivery_order_id && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{o.delivery_order_id}</span>
                            {o.delivery_status && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                o.delivery_status === "delivered" ? "bg-green-500/10 text-green-600" :
                                o.delivery_status === "out_for_delivery" ? "bg-violet-500/10 text-violet-600" :
                                o.delivery_status === "cancelled" ? "bg-red-500/10 text-red-600" :
                                "bg-blue-500/10 text-blue-600"
                              }`}>
                                {o.delivery_status === "confirmed" ? "Баталгаажсан" :
                                 o.delivery_status === "phone_confirmed" ? "Утсаар баталгаажсан" :
                                 o.delivery_status === "out_for_delivery" ? "Хүргэлтэнд" :
                                 o.delivery_status === "delivered" ? "Хүргэгдсэн" :
                                 o.delivery_status === "cancelled" ? "Цуцлагдсан" :
                                 o.delivery_status === "processing" ? "Боловсруулж байна" : o.delivery_status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const itemNames = orderItems.map((item: any) => {
                              const code = item.product_code || item.sku || "";
                              return code ? `${item.name} — ${code}` : item.name;
                            }).join(" | ");
                            const clipText = [
                              o.phone || "",
                              "",
                              itemNames,
                              String(o.total),
                              "",
                              "EasyShop\tOnline",
                              "",
                              o.shipping_address || "",
                            ].join("\t");
                            navigator.clipboard.writeText(clipText).then(() => toast.success("Excel-д хуулагдлаа")).catch(() => toast.error("Хуулж чадсангүй"));
                          }}
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="Excel-д хуулах"
                        >
                          📋
                        </button>
                        {!o.delivery_order_id && o.status !== "cancelled" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); sendToDelivery(o.id); }}
                            disabled={sendingDelivery === o.id}
                            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                            title="Хүргэлтэнд илгээх"
                          >
                            {sendingDelivery === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                          </button>
                        )}
                        {o.status === "cancelled" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteOrderTarget({ id: o.id }); }}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                            title="Устгах"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                  </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-4">
                        {/* Order items */}
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground mb-2">Захиалсан бараанууд</h4>
                          <div className="space-y-2">
                            {orderItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3">
                                {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-secondary" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{item.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {item.product_code && <span className="font-mono mr-1">SKU: {item.product_code}</span>}
                                    {item.product_code && (item.color || item.size) && "· "}
                                    {[item.color && `Өнгө: ${item.color}`, item.size && `Хэмжээ: ${item.size}`].filter(Boolean).join(" · ")}
                                    {(item.product_code || item.color || item.size) ? " · " : ""}x{item.quantity}
                                  </p>
                                </div>
                                <span className="text-xs font-bold">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment method info */}
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground mb-2">Төлбөрийн мэдээлэл</h4>
                          <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1">
                            <p><span className="text-muted-foreground">Төлбөрийн суваг:</span> <span className="font-medium">{paymentMethodLabels[(o.payment_method || "cash").toLowerCase()]?.label || o.payment_method || "Бэлнээр"}</span></p>
                            <p><span className="text-muted-foreground">Төлбөрийн төлөв:</span> <span className={`font-medium ${o.payment_status === "confirmed" ? "text-emerald-600" : "text-amber-600"}`}>{o.payment_status === "confirmed" ? "Төлбөр орсон" : o.payment_status === "unpaid" ? "Төлөгдөөгүй" : o.payment_status}</span></p>
                            {o.order_ref && <p><span className="text-muted-foreground">Лавлах дугаар:</span> <span className="font-medium">{o.order_ref}</span></p>}
                          </div>
                        </div>
                        {delOpt && (
                          <div>
                            <h4 className="text-xs font-bold text-muted-foreground mb-2">Хүргэлтийн мэдээлэл</h4>
                            <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1">
                              <p><span className="text-muted-foreground">Хүргэлт:</span> <span className="font-medium">{delOpt.name}</span></p>
                              <p><span className="text-muted-foreground">Төлбөр:</span> <span className="font-medium">{o.delivery_fee > 0 ? formatPrice(o.delivery_fee) : "Үнэгүй"}</span></p>
                              <p><span className="text-muted-foreground">Хугацаа:</span> <span className="font-medium">{delOpt.estimated_days_min}-{delOpt.estimated_days_max} хоног</span></p>
                              {delOpt.address && <p><span className="text-muted-foreground">Хаяг:</span> <span className="font-medium">{delOpt.address}</span></p>}
                              {delOpt.phone && <p><span className="text-muted-foreground">Утас:</span> <span className="font-medium">{delOpt.phone}</span></p>}
                              {delOpt.payment_terms && <p><span className="text-muted-foreground">Төлбөрийн нөхцөл:</span> <span className="font-medium">{delOpt.payment_terms}</span></p>}
                            </div>
                          </div>
                        )}
                        {/* ON Shop Delivery info */}
                        {o.delivery_order_id && (
                          <div>
                            <h4 className="text-xs font-bold text-muted-foreground mb-2">ON Shop Delivery</h4>
                            <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1">
                              <p><span className="text-muted-foreground">Дугаар:</span> <span className="font-mono font-medium">{o.delivery_order_id}</span></p>
                              {o.delivery_status && <p><span className="text-muted-foreground">Төлөв:</span> <span className="font-medium">{
                                o.delivery_status === "confirmed" ? "Баталгаажсан" :
                                o.delivery_status === "phone_confirmed" ? "Утсаар баталгаажсан" :
                                o.delivery_status === "out_for_delivery" ? "Хүргэлтэнд гарсан" :
                                o.delivery_status === "delivered" ? "Хүргэгдсэн" :
                                o.delivery_status === "cancelled" ? "Цуцлагдсан" :
                                o.delivery_status === "processing" ? "Боловсруулж байна" : o.delivery_status
                              }</span></p>}
                            </div>
                          </div>
                        )}

                        {/* Shipping address */}
                        {o.shipping_address && (
                          <div>
                            <h4 className="text-xs font-bold text-muted-foreground mb-1">Хүлээн авагчийн хаяг</h4>
                            <p className="text-xs">{o.shipping_address}</p>
                          </div>
                        )}

                        {/* Status change */}
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground mb-2">Төлөв өөрчлөх</h4>
                          <select
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            className={`text-xs font-bold px-3 py-2 rounded-xl border border-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusColors[o.status] || "bg-secondary text-muted-foreground"}`}
                          >
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Delivery Photos */}
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground mb-2">Хүргэлтийн зургууд</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Pickup photo */}
                            <div className="space-y-2">
                              <p className="text-[11px] font-medium text-foreground">📦 Авч явсан зураг</p>
                              {o.delivery_pickup_photo ? (
                                <div className="relative group">
                                  <img src={o.delivery_pickup_photo} alt="Авч явсан" className="w-full h-40 object-cover rounded-xl border border-border" />
                                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl cursor-pointer transition-opacity">
                                    <span className="text-white text-xs font-medium">Солих</span>
                                    <input type="file" accept="image/*" className="hidden"
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDeliveryPhotoUpload(o.id, "delivery_pickup_photo", f); }} />
                                  </label>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-secondary/30">
                                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                                  <span className="text-[10px] text-muted-foreground">Зураг оруулах</span>
                                  <input type="file" accept="image/*" className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDeliveryPhotoUpload(o.id, "delivery_pickup_photo", f); }} />
                                </label>
                              )}
                            </div>

                            {/* Completed photo */}
                            <div className="space-y-2">
                              <p className="text-[11px] font-medium text-foreground">✅ Хүргэлт дууссан зураг</p>
                              {o.delivery_completed_photo ? (
                                <div className="relative group">
                                  <img src={o.delivery_completed_photo} alt="Дууссан" className="w-full h-40 object-cover rounded-xl border border-border" />
                                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl cursor-pointer transition-opacity">
                                    <span className="text-white text-xs font-medium">Солих</span>
                                    <input type="file" accept="image/*" className="hidden"
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDeliveryPhotoUpload(o.id, "delivery_completed_photo", f); }} />
                                  </label>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-secondary/30">
                                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                                  <span className="text-[10px] text-muted-foreground">Зураг оруулах</span>
                                  <input type="file" accept="image/*" className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDeliveryPhotoUpload(o.id, "delivery_completed_photo", f); }} />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
                  </>
                );
              })()}
              {orders.length === 0 && !loading && (
                <p className="text-center text-sm text-muted-foreground py-12">Захиалга байхгүй</p>
              )}
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

          {/* Web Analytics */}
          {tab === "analytics" && <WebAnalytics />}

          {/* Collections / Багц линк */}
          {tab === "collections" && <CollectionsManager products={products} />}

          {/* Chatbot settings */}
          {tab === "chatbot" && <ChatbotSettingsManager />}


          {/* Diagnostics Tab */}
          {tab === "diagnostics" && (() => {
            const totalProducts = products.length;
            const withImage = products.filter((p: any) => p.image_url && p.image_url.startsWith("data:")).length;
            const withThumbnail = products.filter((p: any) => p.thumbnail_url).length;
            const withoutThumbnail = products.filter((p: any) => p.image_url && !p.thumbnail_url).length;
            const oversizedProducts = products.filter((p: any) => {
              if (!p.image_url || !p.image_url.startsWith("data:")) return false;
              return estimateBase64Size(p.image_url) > 300 * 1024; // > 300KB
            });
            const totalImageBytes = products.reduce((sum: number, p: any) => {
              if (!p.image_url || !p.image_url.startsWith("data:")) return sum;
              return sum + estimateBase64Size(p.image_url);
            }, 0);
            const avgSize = withImage > 0 ? Math.round(totalImageBytes / withImage / 1024) : 0;
            const noImage = products.filter((p: any) => !p.image_url || p.image_url === "/placeholder.svg").length;

            return (
              <div className="space-y-4">
                <div className="bg-card rounded-2xl p-4 md:p-6 border border-border">
                  <h3 className="font-bold text-sm mb-4">📊 Зургийн статистик</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
                      <p className="text-xs text-muted-foreground">Нийт бараа</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{withImage}</p>
                      <p className="text-xs text-muted-foreground">Base64 зурагтай</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{withThumbnail}</p>
                      <p className="text-xs text-muted-foreground">Thumbnail-тэй</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{withoutThumbnail}</p>
                      <p className="text-xs text-muted-foreground">Thumbnail-гүй</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-4 md:p-6 border border-border">
                  <h3 className="font-bold text-sm mb-4">💾 Хэмжээний мэдээлэл</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{(totalImageBytes / 1024 / 1024).toFixed(1)} MB</p>
                      <p className="text-xs text-muted-foreground">Нийт зургийн хэмжээ</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{avgSize} KB</p>
                      <p className="text-xs text-muted-foreground">Дундаж хэмжээ</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{oversizedProducts.length}</p>
                      <p className="text-xs text-muted-foreground">&gt;300KB зураг</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl p-4 md:p-6 border border-border">
                  <h3 className="font-bold text-sm mb-3">⚡ Зөвлөмж</h3>
                  <div className="space-y-2 text-sm">
                    {withoutThumbnail > 0 && (
                      <div className="flex items-start gap-2 bg-amber-500/10 text-amber-700 p-3 rounded-xl">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span><strong>{withoutThumbnail}</strong> бараа thumbnail-гүй байна. Бараа дахин хадгалж thumbnail үүсгэнэ үү.</span>
                      </div>
                    )}
                    {oversizedProducts.length > 0 && (
                      <div className="flex items-start gap-2 bg-amber-500/10 text-amber-700 p-3 rounded-xl">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span><strong>{oversizedProducts.length}</strong> бараа 300KB-ээс том зурагтай. Зургийг дахин оруулж оновчлоно уу.</span>
                      </div>
                    )}
                    {noImage > 0 && (
                      <div className="flex items-start gap-2 bg-blue-500/10 text-blue-700 p-3 rounded-xl">
                        <ImageIcon className="h-4 w-4 mt-0.5 shrink-0" />
                        <span><strong>{noImage}</strong> бараа зурагүй байна.</span>
                      </div>
                    )}
                    {withoutThumbnail === 0 && oversizedProducts.length === 0 && noImage === 0 && (
                      <div className="flex items-start gap-2 bg-emerald-500/10 text-emerald-700 p-3 rounded-xl">
                        <Eye className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>Бүх зураг оновчлогдсон байна! ✅</span>
                      </div>
                    )}
                  </div>
                </div>

                {oversizedProducts.length > 0 && (
                  <div className="bg-card rounded-2xl p-4 md:p-6 border border-border">
                    <h3 className="font-bold text-sm mb-3">🔴 Том зурагтай бараанууд (300KB+)</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {oversizedProducts.slice(0, 20).map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-muted-foreground">{p.product_code || "—"}</span>
                            <span className="text-sm text-foreground truncate">{p.name}</span>
                          </div>
                          <span className="text-xs font-bold text-destructive shrink-0">
                            {Math.round(estimateBase64Size(p.image_url) / 1024)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color name audit */}
                {(() => {
                  type Row = {
                    productId: string;
                    productName: string;
                    productCode: string;
                    colorId: string;
                    colorIndex: number;
                    scope: string;
                    raw: string;
                    normalized: string;
                    hex: string;
                    source: string;
                    isFallback: boolean;
                  };
                  const rows: Row[] = [];
                  const seen = new Set<string>();
                  for (const p of products) {
                    const colors = Array.isArray(p.colors) ? p.colors : [];
                    for (let i = 0; i < colors.length; i++) {
                      const c = colors[i];
                      const name = (c?.name || "").toString();
                      if (!name.trim()) continue;
                      const colorId = c?.id ? String(c.id) : "";
                      const scope = `${p.product_code || p.id}::${colorId || i}`;
                      const r = resolveColor(name, scope);
                      const key = `${p.id}::${name}::${scope}`;
                      if (seen.has(key)) continue;
                      seen.add(key);
                      rows.push({
                        productId: p.id,
                        productName: p.name,
                        productCode: p.product_code || "",
                        colorId,
                        colorIndex: i,
                        scope,
                        raw: name,
                        normalized: r.normalized,
                        hex: r.hex,
                        source: r.source,
                        isFallback: r.source === "fallback",
                      });
                    }
                  }
                  const fallbackRows = rows.filter((r) => r.isFallback);
                  const okRows = rows.filter((r) => !r.isFallback);

                  return (
                    <div className="bg-card rounded-2xl p-4 md:p-6 border border-border">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h3 className="font-bold text-sm">🎨 Өнгөний алдааны хяналт</h3>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-secondary px-2 py-1 rounded-full">Нийт: <strong>{rows.length}</strong></span>
                          <span className="bg-emerald-500/10 text-emerald-700 px-2 py-1 rounded-full">Танигдсан: <strong>{okRows.length}</strong></span>
                          <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-full">Fallback: <strong>{fallbackRows.length}</strong></span>
                        </div>
                      </div>

                      {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Бараанд өнгөний сонголт олдсонгүй.</p>
                      ) : (
                        <>
                          {fallbackRows.length > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                                <p className="text-xs font-semibold text-destructive">
                                  ⚠ Танигдаагүй / fallback өнгө ({fallbackRows.length})
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const text = fallbackRows.map((r) =>
                                      `[${r.productCode || r.productId}] "${r.productName}" | color#${r.colorIndex}${r.colorId ? ` id=${r.colorId}` : ""} | name="${r.raw}" | norm="${r.normalized}" | scope=${r.scope} | hex=${r.hex}`
                                    ).join("\n");
                                    navigator.clipboard.writeText(text);
                                    toast.success(`${fallbackRows.length} мөр хуулагдлаа`);
                                  }}
                                  className="text-[11px] bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-md font-medium"
                                >
                                  📋 Лог хуулах
                                </button>
                              </div>
                              <div className="space-y-1.5 max-h-96 overflow-y-auto rounded-xl border border-destructive/20 bg-destructive/5 p-2">
                                {fallbackRows.slice(0, 200).map((r, i) => (
                                  <div
                                    key={i}
                                    className="font-mono text-[11px] leading-relaxed bg-card rounded-lg px-3 py-2 border border-border"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className="inline-block w-4 h-4 rounded-full border border-border shrink-0"
                                        style={{ backgroundColor: r.hex }}
                                      />
                                      <span className="font-semibold text-foreground truncate">
                                        {r.productName}
                                      </span>
                                      <span className="text-muted-foreground shrink-0">
                                        [{r.productCode || r.productId.slice(0, 8)}]
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground pl-6">
                                      <div><span className="text-foreground/70">name:</span> "{r.raw}"</div>
                                      <div><span className="text-foreground/70">normalized:</span> "{r.normalized || "—"}"</div>
                                      <div><span className="text-foreground/70">color_index:</span> #{r.colorIndex}{r.colorId && ` (id=${r.colorId})`}</div>
                                      <div><span className="text-foreground/70">scope:</span> {r.scope}</div>
                                      <div className="md:col-span-2"><span className="text-foreground/70">fallback_hex:</span> <span className="text-destructive font-semibold">{r.hex}</span></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {fallbackRows.length > 200 && (
                                <p className="text-[11px] text-muted-foreground mt-1">Эхний 200 мөрийг харууллаа.</p>
                              )}
                            </div>
                          )}

                          <details>
                            <summary className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground">
                              ✓ Танигдсан өнгөнүүд ({okRows.length})
                            </summary>
                            <div className="overflow-x-auto rounded-xl border border-border mt-2">
                              <table className="w-full text-xs">
                                <thead className="bg-secondary text-left">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Өнгө</th>
                                    <th className="px-3 py-2 font-semibold">Эх нэр</th>
                                    <th className="px-3 py-2 font-semibold">Normalize</th>
                                    <th className="px-3 py-2 font-semibold">Hex</th>
                                    <th className="px-3 py-2 font-semibold">Эх үүсвэр</th>
                                    <th className="px-3 py-2 font-semibold">Бараа</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {okRows.slice(0, 200).map((r, i) => (
                                    <tr key={i} className="border-t border-border">
                                      <td className="px-3 py-2">
                                        <span
                                          className="inline-block w-5 h-5 rounded-full border border-border align-middle"
                                          style={{ backgroundColor: r.hex }}
                                        />
                                      </td>
                                      <td className="px-3 py-2 font-mono">{r.raw}</td>
                                      <td className="px-3 py-2 font-mono text-muted-foreground">{r.normalized || "—"}</td>
                                      <td className="px-3 py-2 font-mono text-muted-foreground">{r.hex}</td>
                                      <td className="px-3 py-2 text-muted-foreground">{r.source}</td>
                                      <td className="px-3 py-2 truncate max-w-[200px]">{r.productName}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {okRows.length > 200 && (
                              <p className="text-[11px] text-muted-foreground mt-1">Эхний 200 мөрийг харууллаа.</p>
                            )}
                          </details>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

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
                  <input placeholder="Логоны URL (https://...)" value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <div className="flex items-center gap-3">
                    <input ref={brandLogoFileRef} type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) { toast.error("Зөвхөн зураг оруулна уу"); return; }
                        if (file.size > 5 * 1024 * 1024) { toast.error("Зураг 5MB-ээс бага байх ёстой"); return; }
                        try {
                          const webpUrl = await optimizeImage(file);
                          setBrandLogo(webpUrl);
                          toast.success("Лого оруулагдлаа");
                        } catch { toast.error("Зураг оновчлоход алдаа"); }
                        if (brandLogoFileRef.current) brandLogoFileRef.current.value = "";
                      }}
                    />
                    <button type="button" onClick={() => brandLogoFileRef.current?.click()}
                      className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
                      <Upload className="h-4 w-4" />
                      Лого оруулах
                    </button>
                    {brandLogo && (
                      <img src={brandLogo} alt="Лого" className="h-12 w-12 rounded-lg object-contain border border-border bg-background" />
                    )}
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

          {/* Delivery Tab */}
          {tab === "delivery" && (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
                <h3 className="font-bold text-sm">{editDeliveryId ? "Хүргэлт засах" : "Шинэ хүргэлтийн сонголт нэмэх"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Хүргэлтийн нэр *" value={deliveryForm.name}
                    onChange={(e) => setDeliveryForm(f => ({ ...f, name: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input placeholder="Үнэ (₮)" type="number" value={deliveryForm.price || ""}
                    onChange={(e) => setDeliveryForm(f => ({ ...f, price: Number(e.target.value) }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <textarea placeholder="Тайлбар (заавал биш)" value={deliveryForm.description}
                  onChange={(e) => setDeliveryForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Хаяг (жишээ: Хан-Уул дүүрэг, 3-р хороо)" value={deliveryForm.address}
                    onChange={(e) => setDeliveryForm(f => ({ ...f, address: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input placeholder="Утасны дугаар" value={deliveryForm.phone}
                    onChange={(e) => setDeliveryForm(f => ({ ...f, phone: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <textarea placeholder="Төлбөрийн нөхцөл (жишээ: Бэлэн мөнгө, Дансаар, Хүргэлтийн үед төлөх...)" value={deliveryForm.payment_terms}
                  onChange={(e) => setDeliveryForm(f => ({ ...f, payment_terms: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Хамгийн бага хоног</label>
                    <input type="number" min={0} value={deliveryForm.estimated_days_min}
                      onChange={(e) => setDeliveryForm(f => ({ ...f, estimated_days_min: Number(e.target.value) }))}
                      className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Хамгийн их хоног</label>
                    <input type="number" min={0} value={deliveryForm.estimated_days_max}
                      onChange={(e) => setDeliveryForm(f => ({ ...f, estimated_days_max: Number(e.target.value) }))}
                      className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={deliveryForm.is_active}
                        onChange={(e) => setDeliveryForm(f => ({ ...f, is_active: e.target.checked }))}
                        className="w-4 h-4 rounded border-border" />
                      <span className="text-sm">Идэвхтэй</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveDelivery}
                    className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                    {editDeliveryId ? "Шинэчлэх" : "Нэмэх"}
                  </button>
                  {editDeliveryId && (
                    <button onClick={resetDeliveryForm}
                      className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                      Болих
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {deliveryOptions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${d.is_active ? 'bg-primary/10' : 'bg-secondary'}`}>
                        <Truck className={`h-5 w-5 ${d.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{d.name}</p>
                          {!d.is_active && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Идэвхгүй</span>
                          )}
                        </div>
                        {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs font-bold text-primary">
                            {d.price > 0 ? formatPrice(d.price) : "Үнэгүй"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {d.estimated_days_min}-{d.estimated_days_max} хоног
                          </span>
                          {d.phone && <span className="text-[10px] text-muted-foreground">📞 {d.phone}</span>}
                        </div>
                        {d.address && <p className="text-[10px] text-muted-foreground mt-0.5">📍 {d.address}</p>}
                        {d.payment_terms && <p className="text-[10px] text-muted-foreground">💳 {d.payment_terms}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleDeliveryActive(d.id, d.is_active)}
                        className={`p-2 rounded-lg transition-colors ${d.is_active ? 'hover:bg-amber-500/10 text-amber-600' : 'hover:bg-green-500/10 text-green-600'}`}
                        title={d.is_active ? "Идэвхгүй болгох" : "Идэвхтэй болгох"}>
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => {
                        setDeliveryForm({
                          name: d.name, description: d.description || "",
                          price: d.price, estimated_days_min: d.estimated_days_min,
                          estimated_days_max: d.estimated_days_max, is_active: d.is_active,
                          address: d.address || "", phone: d.phone || "",
                          payment_terms: d.payment_terms || "",
                        });
                        setEditDeliveryId(d.id);
                      }}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteDelivery(d.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {deliveryOptions.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Хүргэлтийн сонголт байхгүй</p>
                )}
              </div>
            </div>
          )}

          {/* Payment Providers Tab */}
          {tab === "payments" && (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
                <h3 className="font-bold text-sm">{editPpId ? "Төлбөрийн хэрэгсэл засах" : "Шинэ төлбөрийн хэрэгсэл нэмэх"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Нэр *" value={ppForm.name} onChange={(e) => setPpForm(f => ({ ...f, name: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input placeholder="Icon (emoji, жишээ: 🏦)" value={ppForm.icon} onChange={(e) => setPpForm(f => ({ ...f, icon: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <textarea placeholder="Тайлбар (заавал биш)" value={ppForm.description} onChange={(e) => setPpForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Лого зураг</label>
                  <div className="flex items-center gap-3">
                    {ppForm.logo_url ? (
                      <img src={ppForm.logo_url} alt="Лого" className="h-14 w-14 rounded-xl object-contain border border-border bg-background p-1" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center text-2xl">{ppForm.icon}</div>
                    )}
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => ppLogoFileRef.current?.click()}
                        className="text-xs text-primary hover:underline flex items-center gap-1"><Upload className="h-3 w-3" /> Зураг оруулах</button>
                      {ppForm.logo_url && (
                        <button type="button" onClick={() => setPpForm(f => ({ ...f, logo_url: "" }))} className="text-destructive text-xs hover:underline">Устгах</button>
                      )}
                    </div>
                    <input ref={ppLogoFileRef} type="file" accept="image/*" className="hidden" onChange={handlePpLogoUpload} />
                  </div>
                  <input placeholder="Эсвэл лого URL оруулах (https://...)" value={ppForm.logo_url}
                    onChange={(e) => setPpForm(f => ({ ...f, logo_url: e.target.value }))}
                    className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ppForm.is_active} onChange={(e) => setPpForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="rounded border-border" />
                    <span className="text-sm">Идэвхтэй</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSavePaymentProvider}
                    className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                    {editPpId ? "Шинэчлэх" : "Нэмэх"}
                  </button>
                  {editPpId && (
                    <button onClick={() => { setPpForm({ name: "", logo_url: "", color: "bg-blue-500", icon: "💳", description: "", is_active: true }); setEditPpId(null); }}
                      className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                      Болих
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {paymentProviders.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between bg-card rounded-xl p-4 border border-border ${!p.is_active ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt={p.name} className="h-10 w-10 rounded-lg object-contain bg-secondary p-1 shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
                          {p.icon || "💳"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{p.name}</p>
                          {!p.is_active && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Идэвхгүй</span>
                          )}
                        </div>
                        {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={async () => {
                        const { error } = await supabase.from("payment_providers").update({ is_active: !p.is_active }).eq("id", p.id);
                        if (error) toast.error(error.message);
                        else fetchPaymentProviders();
                      }}
                        className={`p-2 rounded-lg transition-colors ${p.is_active ? 'hover:bg-amber-500/10 text-amber-600' : 'hover:bg-green-500/10 text-green-600'}`}
                        title={p.is_active ? "Идэвхгүй болгох" : "Идэвхтэй болгох"}>
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setPpForm({ name: p.name, logo_url: p.logo_url || "", color: p.color || "bg-blue-500", icon: p.icon || "💳", description: p.description || "", is_active: p.is_active }); setEditPpId(p.id); }}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeletePaymentProvider(p.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {paymentProviders.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Төлбөрийн хэрэгсэл байхгүй</p>
                )}
              </div>
            </div>
          )}

          {/* Banner Tab */}
          {tab === "banner" && (
            <div className="space-y-6">
              {/* Banner Management */}
              <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
                <h3 className="font-bold text-sm">{editBannerId ? "Баннер засах" : "Шинэ баннер нэмэх"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Гарчиг *" value={bannerForm.title} onChange={(e) => setBannerForm(f => ({ ...f, title: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input placeholder="Дэд гарчиг" value={bannerForm.subtitle} onChange={(e) => setBannerForm(f => ({ ...f, subtitle: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input placeholder="Товчлуурын текст" value={bannerForm.button_text} onChange={(e) => setBannerForm(f => ({ ...f, button_text: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input placeholder="Товчлуурын линк (жишээ: /shop)" value={bannerForm.button_link} onChange={(e) => setBannerForm(f => ({ ...f, button_link: e.target.value }))}
                    className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                {/* Banner Image Upload */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Баннер зураг (арын зураг)</label>
                  <div className="flex items-center gap-3">
                    {bannerForm.banner_image ? (
                      <img src={bannerForm.banner_image} alt="Баннер" className="h-20 w-36 rounded-xl object-cover border border-border" />
                    ) : (
                      <div className="h-20 w-36 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <button type="button" onClick={() => bannerImageFileRef.current?.click()}
                        className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 rounded-lg px-3 py-2 text-xs font-medium transition-colors">
                        <Upload className="h-3.5 w-3.5" /> Зураг оруулах
                      </button>
                      {bannerForm.banner_image && (
                        <button type="button" onClick={() => setBannerForm(f => ({ ...f, banner_image: "" }))}
                          className="text-xs text-destructive hover:underline">Зураг устгах</button>
                      )}
                      <input ref={bannerImageFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerImageUpload} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveBanner}
                    className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                    {editBannerId ? "Шинэчлэх" : "Нэмэх"}
                  </button>
                  {editBannerId && (
                    <button onClick={() => { setBannerForm({ title: "", subtitle: "", button_text: "Бүтээгдхүүн үзэх", button_link: "/shop", banner_image: "" }); setEditBannerId(null); }}
                      className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                      Болих
                    </button>
                  )}
                </div>
              </div>

              {/* Banner List */}
              <div className="space-y-2">
                {promoBanners.map((b) => (
                  <div key={b.id} className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{b.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Товч: {b.button_text} → {b.button_link}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <button onClick={() => toggleBannerActive(b.id, b.is_active)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${b.is_active ? "bg-green-500/10 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                          {b.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                        </button>
                        <button onClick={() => { setBannerForm({ title: b.title, subtitle: b.subtitle || "", button_text: b.button_text || "", button_link: b.button_link || "/shop", banner_image: b.banner_image || "" }); setEditBannerId(b.id); }}
                          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteBanner(b.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {promoBanners.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Баннер байхгүй</p>
                )}
              </div>

              {/* Payment Providers Section within Banner tab */}
              <div className="border-t border-border pt-6">
                <h3 className="font-bold text-base mb-4">Доод талын лого / Төлбөрийн сувгууд</h3>
                <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
                  <h4 className="font-bold text-sm">{editPpId ? "Лого засах" : "Шинэ лого нэмэх"}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input placeholder="Нэр *" value={ppForm.name} onChange={(e) => setPpForm(f => ({ ...f, name: e.target.value }))}
                      className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <input placeholder="Icon (emoji, жишээ: 🏦)" value={ppForm.icon} onChange={(e) => setPpForm(f => ({ ...f, icon: e.target.value }))}
                      className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Лого зураг</label>
                    <div className="flex items-center gap-3">
                      {ppForm.logo_url ? (
                        <img src={ppForm.logo_url} alt="Лого" className="h-14 w-14 rounded-xl object-contain border border-border bg-background p-1" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center text-2xl">{ppForm.icon}</div>
                      )}
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => ppLogoFileRef.current?.click()}
                          className="text-xs text-primary hover:underline flex items-center gap-1"><Upload className="h-3 w-3" /> Зураг оруулах</button>
                        {ppForm.logo_url && (
                          <button type="button" onClick={() => setPpForm(f => ({ ...f, logo_url: "" }))} className="text-destructive text-xs hover:underline">Устгах</button>
                        )}
                      </div>
                      <input ref={ppLogoFileRef} type="file" accept="image/*" className="hidden" onChange={handlePpLogoUpload} />
                    </div>
                    <input placeholder="Эсвэл лого URL оруулах (https://...)" value={ppForm.logo_url}
                      onChange={(e) => setPpForm(f => ({ ...f, logo_url: e.target.value }))}
                      className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSavePaymentProvider}
                      className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                      {editPpId ? "Шинэчлэх" : "Нэмэх"}
                    </button>
                    {editPpId && (
                      <button onClick={() => { setPpForm({ name: "", logo_url: "", color: "bg-blue-500", icon: "💳", description: "", is_active: true }); setEditPpId(null); }}
                        className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                        Болих
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {paymentProviders.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-card rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-3">
                        {p.logo_url ? (
                          <img src={p.logo_url} alt={p.name} className="h-10 w-10 rounded-lg object-contain bg-secondary p-1" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-lg">
                            {p.icon || "💳"}
                          </div>
                        )}
                        <p className="text-sm font-semibold">{p.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setPpForm({ name: p.name, logo_url: p.logo_url || "", color: p.color || "bg-blue-500", icon: p.icon || "💳", description: p.description || "", is_active: p.is_active }); setEditPpId(p.id); }}
                          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeletePaymentProvider(p.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {paymentProviders.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Лого байхгүй</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <NiimbotInstructionsModal open={showXlsxHelp} onOpenChange={setShowXlsxHelp} mode="xlsx" />
    </div>
  );
};

export default AdminPage;
