import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, Plus, Pencil, Trash2, Users, ShoppingBag, Package,
  BarChart3, LayoutDashboard, Search, X, AlertTriangle, Image as ImageIcon, Eye, Upload, Loader2, ChevronDown, Tag, Layers, Video, Truck, CreditCard, Megaphone, Globe, Copy, Link2, MessageCircle, Settings, Printer, FileSpreadsheet, Sparkles,
  Calendar, MapPin, Phone, User, FileText, Wallet, Receipt, Store, Activity, RefreshCw
} from "lucide-react";
import WebAnalytics from "@/components/admin/WebAnalytics";
import CollectionsManager from "@/components/admin/CollectionsManager";
import ChatbotSettingsManager from "@/components/admin/ChatbotSettingsManager";
import RecommendationSettingsManager from "@/components/admin/RecommendationSettingsManager";
import StockDeductionLog from "@/components/admin/StockDeductionLog";
import TrackingDashboard from "@/components/admin/TrackingDashboard";
import AdminSkeleton from "@/components/admin/AdminSkeleton";


import { useRef } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/data/products";
import { optimizeImage, generateThumbnail, estimateBase64Size, cropAndOptimizeImage } from "@/lib/imageOptimize";
import { resolveColor } from "@/lib/colorMap";
import { cyrillicToLatinSlug } from "@/lib/cyrillicToLatin";
import { parseAddressBlob } from "@/lib/addressParser";
import { printOrder, printOrders } from "@/lib/printOrder";
import { downloadManualItemsPdf } from "@/lib/manualItemsPdf";
import { downloadOrderLabelsPdf } from "@/lib/orderLabelsPdf";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { NiimbotBulkXlsxButton } from "@/components/niimbot/NiimbotBulkXlsxButton";
import { NiimbotInstructionsModal } from "@/components/niimbot/NiimbotInstructionsModal";
import { PrintChecklistModal } from "@/components/admin/PrintChecklistModal";
import { mapOrderToLabelData } from "@/lib/niimbot/mapOrder";
import { generateNiimbotXlsx, buildXlsxFilename } from "@/lib/niimbot/xlsx";
import { downloadBlob } from "@/lib/niimbot/transfer";
import { printOrdersTable, loadPrintFields, buildSelectedOrdersXlsxRows, type PrintFieldConfig } from "@/lib/printOrdersTable";
import { PrintFieldsSettings } from "@/components/admin/PrintFieldsSettings";
import * as XLSX from "xlsx";

type Tab = "stats" | "tracking" | "products" | "orders" | "users" | "categories" | "brands" | "delivery" | "payments" | "banner" | "collections" | "chatbot" | "analytics" | "diagnostics" | "stocklog" | "recommendations" | "settings";

const SETTINGS_TABS: Tab[] = ["categories", "brands", "delivery", "payments", "banner", "collections", "analytics", "diagnostics", "stocklog", "recommendations"];

const AdminPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isModerator, loading: authLoading, authError } = useAuth();
  const hasAdminAccess = isAdmin || isModerator;
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab") as Tab | null;
    const valid: Tab[] = ["stats","products","orders","users","categories","brands","delivery","payments","banner","collections","chatbot","analytics","diagnostics","settings"];
    return t && valid.includes(t) ? t : "stats";
  });
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<any[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<any[]>([]);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [adImages, setAdImages] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Promo banner form state
  const [bannerForm, setBannerForm] = useState({ title: "", subtitle: "", button_text: "Бүтээгдхүүн үзэх", button_link: "/shop", banner_image: "" });
  const [editBannerId, setEditBannerId] = useState<string | null>(null);
  const bannerImageFileRef = useRef<HTMLInputElement>(null);

  // ADS image form state
  const [adForm, setAdForm] = useState<{ image_url: string; link_url: string; placement: "top" | "middle"; aspect: string; device: "all" | "mobile" | "tablet" | "desktop" }>({ image_url: "", link_url: "", placement: "top", aspect: "21:9", device: "all" });
  const [editAdId, setEditAdId] = useState<string | null>(null);
  const adImageFileRef = useRef<HTMLInputElement>(null);


  // Category/Brand form state
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [editBrandId, setEditBrandId] = useState<string | null>(null);
  const brandLogoFileRef = useRef<HTMLInputElement>(null);
  const [orderingBrand, setOrderingBrand] = useState<{ id: string; name: string } | null>(null);
  const [brandOrderItems, setBrandOrderItems] = useState<{ id: string; name: string; thumbnail_url: string | null; image_url: string | null }[]>([]);
  const [brandOrderLoading, setBrandOrderLoading] = useState(false);
  const [brandOrderSaving, setBrandOrderSaving] = useState(false);

  const openBrandOrderModal = async (brand: { id: string; name: string }) => {
    setOrderingBrand(brand);
    setBrandOrderLoading(true);
    setBrandOrderItems([]);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, thumbnail_url, image_url, brand_position")
        .eq("brand_id", brand.id)
        .eq("is_active", true)
        .order("brand_position", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      setBrandOrderItems((data || []).map((p: any) => ({ id: p.id, name: p.name, thumbnail_url: p.thumbnail_url, image_url: p.image_url })));
    } catch (e) {
      console.error(e);
      toast.error("Бараа татахад алдаа гарлаа");
    } finally {
      setBrandOrderLoading(false);
    }
  };

  const moveBrandOrderItem = (idx: number, dir: -1 | 1) => {
    setBrandOrderItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const saveBrandOrder = async () => {
    if (!orderingBrand) return;
    setBrandOrderSaving(true);
    try {
      // Update each product's brand_position
      const updates = brandOrderItems.map((p, i) =>
        supabase.from("products").update({ brand_position: i }).eq("id", p.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      toast.success("Барааны дараалал хадгалагдлаа");
      setOrderingBrand(null);
    } catch (e) {
      console.error(e);
      toast.error("Хадгалахад алдаа гарлаа");
    } finally {
      setBrandOrderSaving(false);
    }
  };

  // Delivery form state
  const [deliveryForm, setDeliveryForm] = useState({
    name: "", description: "", price: 0,
    estimated_days_min: 1, estimated_days_max: 3, is_active: true,
    address: "", phone: "", payment_terms: "",
  });
  const [editDeliveryId, setEditDeliveryId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingOrderItem, setEditingOrderItem] = useState<{ orderId: string; idx: number } | null>(null);
  const [orderItemSearch, setOrderItemSearch] = useState("");
  const [addingItemToOrderId, setAddingItemToOrderId] = useState<string | null>(null);
  const [addItemSearch, setAddItemSearch] = useState("");
  const [savingOrderItems, setSavingOrderItems] = useState<string | null>(null);

  const addOrderItemLocal = (orderId: string, item: any) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const items = Array.isArray(o.items) ? [...o.items] : [];
      items.push(item);
      return { ...o, items };
    }));
  };

  const updateOrderItemLocal = (orderId: string, idx: number, patch: Record<string, any>) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const items = Array.isArray(o.items) ? [...o.items] : [];
      items[idx] = { ...items[idx], ...patch };
      return { ...o, items };
    }));
  };

  const removeOrderItemLocal = (orderId: string, idx: number) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const items = (Array.isArray(o.items) ? o.items : []).filter((_: any, i: number) => i !== idx);
      return { ...o, items };
    }));
  };

  const ELLE_BRAND_ID = '24c51924-70f8-453c-b6cd-7e6eccbda36e';

  const adjustElleStockForOrderEdit = async (orderId: string, orderRef: string | null, oldItems: any[], newItems: any[]) => {
    // Build qty map per product+variant: key = productId | color | size
    const buildMap = (arr: any[]) => {
      const m = new Map<string, { product_id: string; color: string; size: string; qty: number }>();
      for (const it of arr || []) {
        const pid = it?.product_id; if (!pid) continue;
        const color = String(it?.color || '').trim();
        const size = String(it?.size || '').trim();
        const qty = Number(it?.quantity) || 0;
        if (qty <= 0) continue;
        const key = `${pid}|${color}|${size}`;
        const cur = m.get(key);
        if (cur) cur.qty += qty;
        else m.set(key, { product_id: pid, color, size, qty });
      }
      return m;
    };
    const oldMap = buildMap(oldItems);
    const newMap = buildMap(newItems);
    const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

    // Group deltas by product_id
    const byProduct = new Map<string, { color: string; size: string; delta: number }[]>();
    for (const key of allKeys) {
      const o = oldMap.get(key)?.qty || 0;
      const n = newMap.get(key)?.qty || 0;
      const delta = n - o; // positive = need to deduct, negative = need to restore
      if (delta === 0) continue;
      const meta = (newMap.get(key) || oldMap.get(key))!;
      const arr = byProduct.get(meta.product_id) || [];
      arr.push({ color: meta.color, size: meta.size, delta });
      byProduct.set(meta.product_id, arr);
    }
    if (byProduct.size === 0) return;

    const productIds = Array.from(byProduct.keys());
    const { data: prodRows, error: prodErr } = await supabase
      .from('products')
      .select('id, brand_id, variant_stock, stock_quantity, name')
      .in('id', productIds);
    if (prodErr) { console.error('Stock fetch error', prodErr); return; }

    for (const p of prodRows || []) {
      if (p.brand_id !== ELLE_BRAND_ID) continue;
      const changes = byProduct.get(p.id) || [];
      const variantStock: Record<string, any> = { ...((p.variant_stock as Record<string, any>) || {}) };
      let stockTotalDelta = 0;
      const logs: any[] = [];
      for (const ch of changes) {
        const colorPart = (ch.color || "").trim();
        const sizePart = (ch.size || "").trim();
        const vKey = `${colorPart}|${sizePart}`;
        const before = Number(variantStock[vKey] || 0);
        // delta>0 => deduct; delta<0 => restore
        const after = ch.delta > 0 ? Math.max(0, before - ch.delta) : before + Math.abs(ch.delta);
        variantStock[vKey] = after;
        stockTotalDelta += (after - before); // restore positive, deduct negative
        logs.push({
          order_id: orderId,
          order_ref: orderRef,
          product_id: p.id,
          product_name: p.name,
          color: ch.color,
          size: ch.size,
          variant_key: vKey,
          quantity_deducted: ch.delta > 0 ? ch.delta : -Math.abs(ch.delta), // negative = restored
          stock_before: before,
          stock_after: after,
          brand_id: p.brand_id,
        });
      }
      const newStockQty = Math.max(0, Number(p.stock_quantity || 0) + stockTotalDelta);
      const { error: upErr } = await supabase
        .from('products')
        .update({ variant_stock: variantStock, stock_quantity: newStockQty, updated_at: new Date().toISOString() })
        .eq('id', p.id);
      if (upErr) console.error('Stock update error', upErr);
      // Best-effort log (table may reject inserts; ignore errors)
      try { await (supabase as any).from('stock_deduction_log').insert(logs); } catch {}
    }
  };

  const saveOrderItems = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    setSavingOrderItems(orderId);
    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
    const total = subtotal + (Number(order.delivery_fee) || 0);

    // Fetch current DB items to compute Elle Sport stock delta
    let dbOldItems: any[] = [];
    try {
      const { data: cur } = await supabase.from('orders').select('items').eq('id', orderId).maybeSingle();
      dbOldItems = Array.isArray(cur?.items) ? cur!.items : [];
    } catch (e) { console.error('Old items fetch failed', e); }

    const { error } = await supabase.from("orders").update({ items, total, updated_at: new Date().toISOString() }).eq("id", orderId);
    if (error) { setSavingOrderItems(null); toast.error("Хадгалахад алдаа: " + error.message); return; }

    // Apply Elle Sport variant stock adjustments based on diff
    try {
      await adjustElleStockForOrderEdit(orderId, order.order_ref || null, dbOldItems, items);
    } catch (e) { console.error('Elle stock adjust error', e); }

    setSavingOrderItems(null);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, total } : o));
    setEditingOrderItem(null);
    toast.success("Барааны мэдээлэл шинэчлэгдлээ");
  };

  // Payment provider form state
  const [ppForm, setPpForm] = useState({ name: "", logo_url: "", color: "bg-blue-500", icon: "💳", description: "", is_active: true });
  const [editPpId, setEditPpId] = useState<string | null>(null);
  const ppLogoFileRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [giftSearch, setGiftSearch] = useState<{ pkgId: string; q: string }>({ pkgId: "", q: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: 0, original_price: 0,
    image_url: "", category: "general", discount: 0,
    is_new: false, is_on_sale: false, is_bogo: false, has_gift: false, gift_name: "",
    gifts: [] as { product_id: string; name: string; image?: string }[],
    gift_packages: [] as { id: string; name: string; items: { product_id: string; name: string; image?: string }[] }[],
    is_active: true,
    product_code: "", slug: "", specifications: [] as { key: string; value: string }[],
    detail_media: [] as { type: "image" | "video"; url: string; caption: string; thumbnail?: string }[],
    brand_id: "",
    colors: [] as { name: string; image: string; sku: string }[],
    sizes: [] as string[],
    stock_quantity: 0,
    variant_stock: {} as Record<string, number>,
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
  const [userSearch, setUserSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [orderSearchPhone, setOrderSearchPhone] = useState("");
  const [showCancelledRecent, setShowCancelledRecent] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [productSelected, setProductSelected] = useState<Set<string>>(new Set());
  const [bulkDiscountPct, setBulkDiscountPct] = useState<number>(0);
  const [bulkDiscountAmt, setBulkDiscountAmt] = useState<number>(0);
  const [bulkDiscountMode, setBulkDiscountMode] = useState<"pct" | "amt">("pct");
  const [bulkDiscountLoading, setBulkDiscountLoading] = useState(false);
  const [showXlsxHelp, setShowXlsxHelp] = useState(false);
  const [showPrintChecklist, setShowPrintChecklist] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [pendingPrintOrders, setPendingPrintOrders] = useState<any[]>([]);

  // Manual (external) order modal
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState({
    source: "facebook" as "facebook" | "phone" | "instagram" | "store" | "other",
    source_note: "",
    customer_name: "",
    phone: "",
    shipping_address: "",
    addr_district: "",
    addr_khoroo: "",
    addr_khotkhon: "",
    addr_building: "",
    addr_entrance: "",
    addr_apt: "",
    addr_door_code: "",
    addr_landmark: "",
    delivery_option_id: "",
    delivery_fee: 0,
    payment_method: "cash",
    payment_status: "confirmed" as "unpaid" | "confirmed",
    status: "confirmed" as "pending" | "phone_confirmed" | "confirmed" | "preparing" | "delivering" | "completed" | "cancelled",
    note: "",
    sale_date: (() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); })(),
    external_ref: "",
    branch: "Лавай",
  });
  const [manualItems, setManualItems] = useState<{ product_id: string | null; name: string; price: number; quantity: number; product_code?: string; image?: string; is_custom?: boolean; color?: string; size?: string; sku?: string; variant_stock?: number; }[]>([]);
  const [manualProductSearch, setManualProductSearch] = useState("");
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItem, setCustomItem] = useState({ name: "", price: "", quantity: "1", product_code: "" });

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
    fetchAdImages();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProducts(),
      fetchOrders(),
      fetchUsers(),
      fetchCategories(),
      fetchBrands(),
      fetchDeliveryOptions(),
      fetchPaymentProviders(),
      fetchPromoBanners(),
      fetchAdImages(),
    ]);
    setRefreshing(false);
    toast.success("Мэдээлэл шинэчлэгдлээ");
  };

  useEffect(() => {
    if (authLoading || !hasAdminAccess) return;
    loadAdminData();
  }, [authLoading, isAdmin]);

  // Open product editor when URL has ?edit=<id> (supports new tab / right-click open)
  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (!editParam || products.length === 0) return;
    const p = products.find((x) => x.id === editParam);
    if (p && editId !== p.id) {
      handleEditProduct(p);
      if (tab !== "products") setTab("products");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, searchParams]);

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

  const fetchAdImages = async () => {
    try {
      const { data } = await supabase.from("ad_images" as any).select("*").order("position");
      setAdImages((data as any[]) || []);
    } catch { setAdImages([]); }
  };

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Зөвхөн зураг оруулна уу"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Зураг 10MB-ээс бага байх ёстой"); return; }
    try {
      const [w, h] = (adForm.aspect || "21:9").split(":").map(Number);
      const ratio = (w && h) ? w / h : 21 / 9;
      const webpUrl = await cropAndOptimizeImage(file, ratio);
      setAdForm(f => ({ ...f, image_url: webpUrl }));
      toast.success("Зураг ороод автоматаар хэмжээнд таарууллаа");
    } catch { toast.error("Зураг оновчлоход алдаа"); }
    if (adImageFileRef.current) adImageFileRef.current.value = "";
  };

  const validateAdLinkUrl = (raw: string): { ok: true; value: string | null } | { ok: false; error: string } => {
    const v = (raw || "").trim();
    if (!v) return { ok: true, value: null };
    if (v.length > 500) return { ok: false, error: "Холбоос хэт урт байна (500 тэмдэгтээс ихгүй)" };
    // Internal path: must start with / and contain no spaces / control chars
    if (v.startsWith("/")) {
      if (/\s/.test(v)) return { ok: false, error: "Холбоост хоосон зай байж болохгүй" };
      if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/.test(v)) return { ok: false, error: "Дотоод холбоосын формат буруу" };
      return { ok: true, value: v };
    }
    // External: must be http(s)://
    try {
      const u = new URL(v);
      if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "Зөвхөн http эсвэл https холбоос зөвшөөрнө" };
      if (!u.hostname || !u.hostname.includes(".")) return { ok: false, error: "Холбоосын домэйн буруу" };
      return { ok: true, value: u.toString() };
    } catch {
      return { ok: false, error: "URL формат буруу. Жишээ: /shop эсвэл https://example.com" };
    }
  };

  const handleSaveAd = async () => {
    if (!adForm.image_url) { toast.error("Зураг оруулна уу"); return; }
    const linkCheck = validateAdLinkUrl(adForm.link_url);
    if (!linkCheck.ok) { toast.error((linkCheck as { error: string }).error); return; }
    const payload = { image_url: adForm.image_url, link_url: (linkCheck as { value: string | null }).value, placement: adForm.placement, device: adForm.device };
    if (editAdId) {
      const { error } = await supabase.from("ad_images" as any).update(payload).eq("id", editAdId);
      if (error) { toast.error(error.message); return; }
      toast.success("ADS шинэчлэгдлээ");
    } else {
      const { error } = await supabase.from("ad_images" as any).insert({ ...payload, position: adImages.length } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("ADS нэмэгдлээ");
    }
    setAdForm({ image_url: "", link_url: "", placement: "top", aspect: "21:9", device: "all" });
    setEditAdId(null);
    fetchAdImages();
  };

  const handleDeleteAd = async (id: string) => {
    const { error } = await supabase.from("ad_images" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("ADS устгагдлаа"); fetchAdImages(); }
  };

  const toggleAdActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("ad_images" as any).update({ is_active: !currentActive }).eq("id", id);
    if (error) toast.error(error.message);
    else fetchAdImages();
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
      const { data, error } = await supabase.from("products").select("id, name, price, original_price, image_url, thumbnail_url, category, sales, is_new, is_on_sale, is_bogo, has_gift, gift_name, is_active, discount, product_code, slug, brand_id, stock_quantity, variant_stock, colors, sizes, created_at").order("created_at", { ascending: false });
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
      // Use lightweight RPC that strips heavy base64 images from items jsonb
      const { data, error } = await (supabase as any).rpc("admin_list_orders_light");
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to load admin orders", error);
      // Fallback to direct query
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(data || []);
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

  const resetManualForm = () => {
    setManualForm({
      source: "facebook",
      source_note: "",
      customer_name: "",
      phone: "",
      shipping_address: "",
      addr_district: "",
      addr_khoroo: "",
      addr_khotkhon: "",
      addr_building: "",
      addr_entrance: "",
      addr_apt: "",
      addr_door_code: "",
      addr_landmark: "",
      delivery_option_id: "",
      delivery_fee: 0,
      payment_method: "cash",
      payment_status: "confirmed",
      status: "confirmed",
      note: "",
      sale_date: (() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); })(),
      external_ref: "",
      branch: "Лавай",
    });
    setManualItems([]);
    setManualProductSearch("");
    setShowCustomItemForm(false);
    setCustomItem({ name: "", price: "", quantity: "1", product_code: "" });
  };

  const manualSubtotal = manualItems.reduce((s, it) => s + (it.price * it.quantity), 0);
  const manualTotal = manualSubtotal + (Number(manualForm.delivery_fee) || 0);

  const handleCreateManualOrder = async () => {
    if (!manualForm.phone.trim()) { toast.error("Утасны дугаар оруулна уу"); return; }
    if (!manualForm.addr_landmark.trim()) { toast.error("Хүргэлтийн хаяг оруулна уу"); return; }
    if (manualItems.length === 0) { toast.error("Дор хаяж 1 бараа нэмнэ үү"); return; }

    const fullAddress = manualForm.addr_landmark.trim();

    // Auto-generate external_ref: ES-YYMMDD-NNN (тухайн өдрийн дараалал)
    const saleDate = manualForm.sale_date ? new Date(manualForm.sale_date) : new Date();
    const yy = String(saleDate.getFullYear()).slice(-2);
    const mm = String(saleDate.getMonth() + 1).padStart(2, "0");
    const dd = String(saleDate.getDate()).padStart(2, "0");
    const datePrefix = `ES-${yy}${mm}${dd}`;
    let nextSeq = 1;
    try {
      const { data: existing } = await supabase
        .from("orders")
        .select("external_ref")
        .like("external_ref", `${datePrefix}-%`);
      if (existing && existing.length > 0) {
        const maxSeq = existing.reduce((m: number, r: any) => {
          const match = String(r.external_ref || "").match(/-(\d+)$/);
          const n = match ? parseInt(match[1], 10) : 0;
          return n > m ? n : m;
        }, 0);
        nextSeq = maxSeq + 1;
      }
    } catch (e) {
      console.warn("external_ref sequence fetch failed", e);
    }
    const autoExternalRef = `${datePrefix}-${String(nextSeq).padStart(3, "0")}`;

    setManualSubmitting(true);
    try {
      const items = manualItems.map((it) => ({
        product_id: it.product_id,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        product_code: it.sku || it.product_code || null,
        image: it.image || null,
        is_custom: it.is_custom || false,
        color: it.color || null,
        size: it.size || null,
      }));
      const payload: any = {
        items,
        total: manualTotal,
        status: manualForm.status,
        phone: manualForm.phone.trim(),
        shipping_address: fullAddress,
        delivery_option_id: manualForm.delivery_option_id || null,
        delivery_fee: Number(manualForm.delivery_fee) || 0,
        payment_method: manualForm.payment_method,
        payment_status: manualForm.payment_status,
        is_guest: true,
        guest_name: manualForm.customer_name.trim(),
        source: manualForm.source,
        source_note: manualForm.source_note.trim() || null,
        external_ref: autoExternalRef,
        branch: manualForm.branch.trim() || null,
        user_id: null,
      };
      // Хэрэглэгч огноо сонгосон бол created_at-г түүгээр давхар оноох
      if (manualForm.sale_date) {
        const d = new Date(manualForm.sale_date);
        if (!isNaN(d.getTime())) {
          payload.sale_date = d.toISOString();
          payload.created_at = d.toISOString();
        }
      }
      const { data, error } = await supabase.from("orders").insert(payload).select().single();
      if (error) throw error;
      toast.success("Захиалга амжилттай бүртгэгдлээ");
      setOrders((prev) => [data, ...prev]);
      setShowManualOrder(false);
      resetManualForm();
    } catch (e: any) {
      console.error("Manual order create error", e);
      toast.error("Захиалга үүсгэхэд алдаа: " + (e?.message || "тодорхойгүй"));
    } finally {
      setManualSubmitting(false);
    }
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
      // Try admin RPC first (returns email joined from auth.users)
      let baseUsers: any[] = [];
      const { data: rpcData, error: rpcError } = await supabase.rpc("admin_list_users");
      if (!rpcError && rpcData) {
        baseUsers = rpcData as any[];
      } else {
        // Fallback to plain profiles read
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        baseUsers = data || [];
      }

      // Attach roles for each user
      const { data: rolesData, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesErr) console.warn("Failed to load roles", rolesErr);
      const rolesMap: Record<string, string[]> = {};
      (rolesData || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      const enriched = baseUsers.map((u: any) => ({
        ...u,
        roles: rolesMap[u.user_id] || [],
      }));
      setUsers(enriched);
    } catch (error) {
      console.error("Failed to load admin users", error);
      setUsers([]);
    }
  };

  // Toggle a role on/off for a given user (admin only)
  const toggleUserRole = async (
    userId: string,
    role: "admin" | "moderator" | "driver",
    hasRole: boolean
  ) => {
    try {
      if (hasRole) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
        toast.success(`${role} эрх хасагдлаа`);
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
        toast.success(`${role} эрх олгогдлоо`);
      }
      await fetchUsers();
    } catch (e: any) {
      console.error(e);
      toast.error("Алдаа гарлаа: " + (e.message || ""));
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: 0, original_price: 0, image_url: "", category: "general", discount: 0, is_new: false, is_on_sale: false, is_bogo: false, has_gift: false, gift_name: "", gifts: [], gift_packages: [], is_active: true, product_code: "", slug: "", specifications: [], detail_media: [], brand_id: "", colors: [], sizes: [], stock_quantity: 0, variant_stock: {} });
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
      is_new: form.is_new, is_on_sale: form.is_on_sale, is_bogo: form.is_bogo,
      has_gift: form.has_gift,
      gifts: form.has_gift ? (form.gifts || []).filter(g => g && g.product_id && (g.name || "").trim()).map(g => ({ product_id: g.product_id, name: g.name.trim(), image: g.image || "" })) : [],
      gift_packages: form.has_gift
        ? (form.gift_packages || [])
            .map(pkg => ({
              id: pkg.id,
              name: (pkg.name || "").trim() || "Бэлэг",
              items: (pkg.items || []).filter(g => g && g.product_id && (g.name || "").trim()).map(g => ({ product_id: g.product_id, name: g.name.trim(), image: g.image || "" })),
            }))
            .filter(pkg => pkg.items.length > 0)
        : [],
      gift_name: form.has_gift ? ((form.gift_packages || [])[0]?.name || (form.gifts || []).filter(g => g && (g.name || "").trim())[0]?.name?.trim() || null) : null,
      is_active: form.is_active,
      product_code: form.product_code || null,
      slug: form.slug.trim() || cyrillicToLatinSlug(form.name),
      specifications: form.specifications.filter(s => s.key.trim() && s.value.trim()),
      detail_media: form.detail_media.filter(m => m.url.trim()),
      brand_id: form.brand_id || null,
      colors: form.colors.filter(c => c.name.trim()),
      sizes: form.sizes.filter(s => s.trim()),
      ...(() => {
        const b = dbBrands.find((x: any) => x.id === form.brand_id);
        const norm = (b?.name || "").toLowerCase().replace(/\s+/g, "");
        const isElleSport = norm.includes("elle") && norm.includes("sport");
        if (!isElleSport) {
          return { stock_quantity: form.stock_quantity || 0, variant_stock: {} };
        }
        // Filter variant_stock to only valid keys based on current colors/sizes
        const validColors = form.colors.filter(c => c.name.trim()).map(c => c.name);
        const validSizes = form.sizes.filter(s => s.trim());
        const cleaned: Record<string, number> = {};
        const colorList = validColors.length > 0 ? validColors : [""];
        const sizeList = validSizes.length > 0 ? validSizes : [""];
        for (const c of colorList) {
          for (const s of sizeList) {
            const key = `${c}|${s}`;
            const v = Math.max(0, Number(form.variant_stock?.[key]) || 0);
            cleaned[key] = v;
          }
        }
        const total = Object.values(cleaned).reduce((a, b) => a + b, 0);
        return { stock_quantity: total, variant_stock: cleaned };
      })(),
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
      .select("description, colors, sizes, specifications, detail_media, variant_stock, gifts, gift_packages")
      .eq("id", p.id)
      .single();

    const full: any = fullProduct || {};
    const specs = Array.isArray(full.specifications) ? full.specifications : [];
    const media = Array.isArray(full.detail_media) ? full.detail_media : [];
    const giftsArr: { product_id: string; name: string; image?: string }[] = Array.isArray(full.gifts)
      ? full.gifts
          .map((g: any) => (typeof g === "string" ? null : (g?.product_id ? { product_id: g.product_id, name: g.name || "", image: g.image || "" } : null)))
          .filter(Boolean) as any
      : [];
    let pkgArr: { id: string; name: string; items: { product_id: string; name: string; image?: string }[] }[] = Array.isArray(full.gift_packages)
      ? full.gift_packages.map((pkg: any) => ({
          id: pkg?.id || crypto.randomUUID(),
          name: pkg?.name || "Бэлэг",
          items: Array.isArray(pkg?.items)
            ? pkg.items.map((g: any) => ({ product_id: g?.product_id || "", name: g?.name || "", image: g?.image || "" }))
            : [],
        }))
      : [];
    // Legacy fallback: if no packages but legacy gifts exist, convert to single package
    if (pkgArr.length === 0 && giftsArr.length > 0) {
      pkgArr = [{ id: crypto.randomUUID(), name: "Бэлэг", items: giftsArr }];
    }
    setForm({
      name: p.name, description: full.description || "", price: p.price,
      original_price: p.original_price || 0, image_url: p.image_url || "",
      category: p.category, discount: p.discount || 0,
      is_new: p.is_new, is_on_sale: p.is_on_sale, is_bogo: p.is_bogo || false, has_gift: p.has_gift || false, gift_name: p.gift_name || "", gifts: giftsArr, gift_packages: pkgArr, is_active: p.is_active !== false,
      product_code: p.product_code || "",
      slug: p.slug || "",
      specifications: specs.map((s: any) => ({ key: s.key || "", value: s.value || "" })),
      detail_media: media.map((m: any) => ({ type: m.type || "image", url: m.url || "", caption: m.caption || "", thumbnail: m.thumbnail || "" })),
      brand_id: p.brand_id || "",
      colors: Array.isArray(full.colors) ? full.colors.map((c: any) => typeof c === 'string' ? { name: c, image: '', sku: '' } : { name: c.name || '', image: c.image || '', sku: c.sku || '' }) : [],
      sizes: Array.isArray(full.sizes) ? full.sizes : [],
      stock_quantity: typeof p.stock_quantity === "number" ? p.stock_quantity : 0,
      variant_stock: (full.variant_stock && typeof full.variant_stock === "object") ? full.variant_stock : {},
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
      .select("description, colors, sizes, specifications, detail_media, gifts, gift_packages")
      .eq("id", p.id)
      .single();

    const full: any = fullProduct || {};
    const specs = Array.isArray(full.specifications) ? full.specifications : [];
    const media = Array.isArray(full.detail_media) ? full.detail_media : [];
    const dupGifts: { product_id: string; name: string; image?: string }[] = Array.isArray(full.gifts) ? (full.gifts.map((g: any) => (typeof g === "string" ? null : (g?.product_id ? { product_id: g.product_id, name: g.name || "", image: g.image || "" } : null))).filter(Boolean) as any) : [];
    let dupPkgs: { id: string; name: string; items: { product_id: string; name: string; image?: string }[] }[] = Array.isArray(full.gift_packages)
      ? full.gift_packages.map((pkg: any) => ({
          id: crypto.randomUUID(),
          name: pkg?.name || "Бэлэг",
          items: Array.isArray(pkg?.items) ? pkg.items.map((g: any) => ({ product_id: g?.product_id || "", name: g?.name || "", image: g?.image || "" })) : [],
        }))
      : [];
    if (dupPkgs.length === 0 && dupGifts.length > 0) {
      dupPkgs = [{ id: crypto.randomUUID(), name: "Бэлэг", items: dupGifts }];
    }
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
      has_gift: p.has_gift || false,
      gift_name: p.gift_name || "",
      gifts: dupGifts,
      gift_packages: dupPkgs,
      is_active: p.is_active !== false,
      product_code: "", // clear SKU — must be unique
      slug: "",          // auto-generated on save
      specifications: specs.map((s: any) => ({ key: s.key || "", value: s.value || "" })),
      detail_media: media.map((m: any) => ({ type: m.type || "image", url: m.url || "", caption: m.caption || "", thumbnail: m.thumbnail || "" })),
      brand_id: p.brand_id || "",
      colors: Array.isArray(full.colors) ? full.colors.map((c: any) => typeof c === 'string' ? { name: c, image: '', sku: '' } : { name: c.name || '', image: c.image || '', sku: c.sku || '' }) : [],
      sizes: Array.isArray(full.sizes) ? full.sizes : [],
      stock_quantity: 0,
      variant_stock: {},
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

  const handleApplyBulkDiscount = async () => {
    const ids = Array.from(productSelected);
    if (ids.length === 0) { toast.error("Бараа сонгоно уу"); return; }
    const pct = Math.max(0, Math.min(99, Math.round(bulkDiscountPct || 0)));
    const amt = Math.max(0, Math.round(bulkDiscountAmt || 0));
    const isAmt = bulkDiscountMode === "amt";
    setBulkDiscountLoading(true);
    try {
      const targets = products.filter((p: any) => productSelected.has(p.id));
      let okCount = 0;
      for (const p of targets) {
        const base = (p.original_price && p.original_price > 0) ? p.original_price : p.price;
        let payload: any;
        if ((isAmt && amt <= 0) || (!isAmt && pct <= 0)) {
          // remove discount
          payload = { price: base, original_price: null, discount: 0, is_on_sale: false };
        } else if (isAmt) {
          const newPrice = Math.max(0, base - amt);
          const effectivePct = base > 0 ? Math.round((1 - newPrice / base) * 100) : 0;
          payload = { price: newPrice, original_price: base, discount: effectivePct, is_on_sale: true };
        } else {
          const newPrice = Math.round(base * (1 - pct / 100));
          payload = { price: newPrice, original_price: base, discount: pct, is_on_sale: true };
        }
        const { error } = await supabase.from("products").update(payload).eq("id", p.id);
        if (!error) okCount++;
      }
      const msg = (isAmt ? amt > 0 : pct > 0)
        ? (isAmt ? `${okCount} бараанаас ${amt.toLocaleString()}₮ хасч хямдрууллаа` : `${okCount} бараанд ${pct}% хямдрал тооцлоо`)
        : `${okCount} бараанаас хямдрал хаслаа`;
      toast.success(msg);
      setProductSelected(new Set());
      setBulkDiscountPct(0);
      setBulkDiscountAmt(0);
      fetchProducts();
    } finally {
      setBulkDiscountLoading(false);
    }
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(q) || (p.product_code && p.product_code.toLowerCase().includes(q));
    const matchCategory = filterCategory === "all" || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const categories = [...new Set(products.map((p) => p.category))];

  const moderatorTabs: Tab[] = ["orders"];

  // Moderator only sees orders — auto-switch if they land on a non-allowed tab
  useEffect(() => {
    if (!isAdmin && isModerator && !moderatorTabs.includes(tab)) {
      setTab("orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isModerator]);

  const allSidebarItems: { id: Tab; label: string; icon: any }[] = [
    { id: "stats", label: "Статистик", icon: BarChart3 },
    { id: "tracking", label: "Хяналт", icon: Activity },
    { id: "products", label: "Бараа", icon: Package },
    { id: "orders", label: "Захиалга", icon: ShoppingBag },
    { id: "users", label: "Хэрэглэгч", icon: Users },
    { id: "chatbot", label: "AI Чатбот", icon: MessageCircle },
    { id: "settings", label: "Ерөнхий тохиргоо", icon: Settings },
  ];

  const settingsSubItems: { id: Tab; label: string; icon: any }[] = [
    { id: "categories", label: "Ангилал", icon: Layers },
    { id: "brands", label: "Брэнд", icon: Tag },
    { id: "delivery", label: "Хүргэлт", icon: Truck },
    { id: "payments", label: "Төлбөр", icon: CreditCard },
    { id: "banner", label: "Баннер", icon: Megaphone },
    { id: "collections", label: "Багц линк", icon: Link2 },
    { id: "analytics", label: "Хандалт", icon: Globe },
    { id: "diagnostics", label: "Оношлогоо", icon: AlertTriangle },
    { id: "stocklog", label: "Нөөцийн хасалт", icon: Package },
    { id: "recommendations", label: "Зөвлөмжийн жинлүүр", icon: Sparkles },
  ];

  const sidebarItems = isAdmin
    ? allSidebarItems
    : allSidebarItems.filter(item => moderatorTabs.includes(item.id));

  const netTotal = (o: any) => (Number(o.total) || 0) - (Number(o.delivery_fee) || 0);
  const deliveryFeeOf = (o: any) => Number(o.delivery_fee) || 0;

  const paidOrders = orders.filter((o: any) => o.status === 'confirmed' || o.status === 'completed');
  const totalRevenue = paidOrders.reduce((s: number, o: any) => s + netTotal(o), 0);
  const totalDeliveryRevenue = paidOrders.reduce((s: number, o: any) => s + deliveryFeeOf(o), 0);

  // Өнөөдрийн захиалга
  const todayOrders = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return orders.filter((o: any) => o.created_at?.startsWith(today));
  }, [orders]);

  const isPaidStatus = (s: string) => s === 'confirmed' || s === 'preparing' || s === 'delivering' || s === 'completed';
  const todayPaidOrders = todayOrders.filter((o: any) => isPaidStatus(o.status));
  const todayRevenue = todayPaidOrders.reduce((s: number, o: any) => s + netTotal(o), 0);
  const todayDeliveryRevenue = todayPaidOrders.reduce((s: number, o: any) => s + deliveryFeeOf(o), 0);

  // Өнөөдрийн төлвөөр задаргаа
  const todayPreparingRevenue = todayPaidOrders.filter((o: any) => o.status === 'preparing').reduce((s: number, o: any) => s + netTotal(o), 0);
  const todayPreparingCount = todayPaidOrders.filter((o: any) => o.status === 'preparing').length;
  const todayDeliveringRevenue = todayPaidOrders.filter((o: any) => o.status === 'delivering').reduce((s: number, o: any) => s + netTotal(o), 0);
  const todayDeliveringCount = todayPaidOrders.filter((o: any) => o.status === 'delivering').length;
  const todayCompletedRevenue = todayPaidOrders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + netTotal(o), 0);
  const todayCompletedCount = todayPaidOrders.filter((o: any) => o.status === 'completed').length;

  // Энэ долоо хоногийн орлого
  const weekRevenue = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    return orders
      .filter((o: any) => isPaidStatus(o.status) && new Date(o.created_at) >= weekAgo)
      .reduce((s: number, o: any) => s + netTotal(o), 0);
  }, [orders]);

  // Энэ сарын орлого
  const monthRevenue = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return orders
      .filter((o: any) => isPaidStatus(o.status) && new Date(o.created_at) >= monthStart)
      .reduce((s: number, o: any) => s + netTotal(o), 0);
  }, [orders]);

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

      {/* Manual External Order Modal */}
      {showManualOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => !manualSubmitting && setShowManualOrder(false)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Захиалга оруулах</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Гадны сувгаар (Facebook, утас, дэлгүүр) ирсэн захиалгыг гараар бүртгэнэ</p>
              </div>
              <button onClick={() => !manualSubmitting && setShowManualOrder(false)} className="p-1 rounded-lg hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 bg-muted/30">

              {/* SECTION 1 — Sale meta */}
              <section className="bg-card rounded-2xl border border-border overflow-hidden">
                <header className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 border-b border-border">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Үндсэн мэдээлэл</h3>
                </header>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Борлуулсан огноо, цаг *</label>
                    <input
                      type="datetime-local"
                      value={manualForm.sale_date}
                      max={(() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); })()}
                      onChange={(e) => setManualForm((f) => ({ ...f, sale_date: e.target.value }))}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Захиалга үүссэн он/сар/өдөр, цаг минутыг бүртгэнэ</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Дэс дугаар</label>
                    <input
                      type="text"
                      value={(() => {
                        const d = manualForm.sale_date ? new Date(manualForm.sale_date) : new Date();
                        const yy = String(d.getFullYear()).slice(-2);
                        const mm = String(d.getMonth() + 1).padStart(2, "0");
                        const dd = String(d.getDate()).padStart(2, "0");
                        return `ES-${yy}${mm}${dd}-XXX`;
                      })()}
                      disabled
                      placeholder="Хадгалахад автоматаар үүснэ"
                      className="w-full rounded-xl bg-secondary/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block flex items-center gap-1">
                      <Store className="h-3.5 w-3.5" /> Бараа гарах байршил *
                    </label>
                    <select
                      value={manualForm.branch}
                      onChange={(e) => setManualForm((f) => ({ ...f, branch: e.target.value }))}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Лавай">Лавай</option>
                      <option value="Их наяд">Их наяд</option>
                      <option value="Хонгор агуулах">Хонгор агуулах</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* SECTION 2 — Customer */}
              <section className="bg-card rounded-2xl border border-border overflow-hidden">
                <header className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 border-b border-border">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Үйлчлүүлэгч</h3>
                </header>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> Утас *
                    </label>
                    <input
                      type="tel"
                      value={manualForm.phone}
                      onChange={(e) => setManualForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="9911XXXX"
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Хүргэлтийн хаяг *
                    </label>
                    <textarea
                      rows={3}
                      value={manualForm.addr_landmark}
                      onChange={(e) => setManualForm((f) => ({ ...f, addr_landmark: e.target.value.slice(0, 500) }))}
                      placeholder="Дүүрэг, хороо, хотхон, байр, орц, тоот, орцны код гэх мэт дэлгэрэнгүй хаягаа бичнэ үү"
                      className="w-full rounded-xl bg-secondary px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <label className="flex items-center gap-2 w-full rounded-xl bg-secondary/60 px-3 py-2.5 text-sm cursor-pointer hover:bg-secondary transition-colors">
                    <input
                      type="checkbox"
                      checked={Number(manualForm.delivery_fee) > 0}
                      onChange={(e) => setManualForm((f) => ({ ...f, delivery_fee: e.target.checked ? 8000 : 0 }))}
                      className="h-4 w-4 rounded"
                    />
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Хүргэлтийн төлбөр авах</span>
                    <span className="ml-auto text-primary font-bold">8,000₮</span>
                  </label>
                </div>
              </section>

              {/* SECTION 3 — Products */}
              <section className="bg-card rounded-2xl border border-border overflow-hidden">
                <header className="flex items-center justify-between gap-2 px-4 py-2.5 bg-secondary/40 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-sm font-bold truncate">Бараанууд *</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{manualItems.length} төрөл</span>
                    <button
                      type="button"
                      disabled={manualItems.length === 0}
                      onClick={async () => {
                        try {
                          await downloadManualItemsPdf(manualItems);
                          toast.success("PDF татагдлаа");
                        } catch (e) {
                          console.error(e);
                          toast.error("PDF үүсгэхэд алдаа гарлаа");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Сонгосон бараануудыг 70x80mm босоо PDF болгож татах"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>
                </header>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={manualProductSearch}
                        onChange={(e) => setManualProductSearch(e.target.value)}
                        placeholder="Бараа хайх (нэр / SKU)..."
                        className="w-full rounded-xl bg-secondary pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomItemForm((s) => !s)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${showCustomItemForm ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Гараар
                    </button>
                  </div>

                  {showCustomItemForm && (
                    <div className="border border-dashed border-primary/40 rounded-xl p-3 space-y-2 bg-primary/5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Бүртгэлд байхгүй бараа гараар оруулах</p>
                      <input
                        type="text"
                        value={customItem.name}
                        onChange={(e) => setCustomItem((c) => ({ ...c, name: e.target.value }))}
                        placeholder="Барааны нэр *"
                        className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={0}
                          value={customItem.price}
                          onChange={(e) => setCustomItem((c) => ({ ...c, price: e.target.value }))}
                          placeholder="Үнэ ₮ *"
                          className="rounded-lg bg-card border border-border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                          type="number"
                          min={1}
                          value={customItem.quantity}
                          onChange={(e) => setCustomItem((c) => ({ ...c, quantity: e.target.value }))}
                          placeholder="Тоо"
                          className="rounded-lg bg-card border border-border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                          type="text"
                          value={customItem.product_code}
                          onChange={(e) => setCustomItem((c) => ({ ...c, product_code: e.target.value }))}
                          placeholder="SKU"
                          className="rounded-lg bg-card border border-border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowCustomItemForm(false); setCustomItem({ name: "", price: "", quantity: "1", product_code: "" }); }}
                          className="px-3 py-1.5 text-xs rounded-lg hover:bg-secondary"
                        >
                          Болих
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const name = customItem.name.trim();
                            const price = Number(customItem.price);
                            const qty = Math.max(1, Number(customItem.quantity) || 1);
                            if (!name) { toast.error("Барааны нэр шаардлагатай"); return; }
                            if (!price || price < 0) { toast.error("Үнэ зөв оруулна уу"); return; }
                            setManualItems((prev) => [...prev, {
                              product_id: null,
                              name,
                              price,
                              quantity: qty,
                              product_code: customItem.product_code.trim() || undefined,
                              is_custom: true,
                            }]);
                            setCustomItem({ name: "", price: "", quantity: "1", product_code: "" });
                            setShowCustomItemForm(false);
                            toast.success("Бараа нэмэгдлээ");
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Нэмэх
                        </button>
                      </div>
                    </div>
                  )}
                  {manualProductSearch.trim() && (() => {
                    const q = manualProductSearch.toLowerCase();
                    type Row = { key: string; product: any; color?: string; size?: string; sku?: string; image?: string; stock?: number; };
                    const rows: Row[] = [];
                    for (const p of products) {
                      const vs = (p.variant_stock && typeof p.variant_stock === 'object') ? p.variant_stock : {};
                      const colors: any[] = Array.isArray(p.colors) ? p.colors : [];
                      const variantKeys = Object.keys(vs);
                      if (variantKeys.length > 0) {
                        for (const key of variantKeys) {
                          const [color, size] = key.split('|');
                          const cmeta = colors.find((c: any) => (c?.name || '').trim() === (color || '').trim());
                          const sku = cmeta?.sku || p.product_code || '';
                          const image = cmeta?.image || p.thumbnail_url || p.image_url;
                          const stock = Number(vs[key]) || 0;
                          rows.push({ key: `${p.id}|${key}`, product: p, color, size, sku, image, stock });
                        }
                      } else {
                        rows.push({ key: p.id, product: p, sku: p.product_code, image: p.thumbnail_url || p.image_url, stock: p.stock_quantity });
                      }
                    }
                    const filtered = rows.filter((r) => {
                      const hay = `${r.product.name} ${r.sku || ''} ${r.color || ''} ${r.size || ''}`.toLowerCase();
                      return hay.includes(q);
                    }).slice(0, 50);
                    return (
                      <div className="border border-border rounded-xl max-h-72 overflow-y-auto">
                        {filtered.map((r) => {
                          const p = r.product;
                          const isVariant = !!(r.color || r.size);
                          const outOfStock = isVariant && r.stock !== undefined && r.stock <= 0;
                          return (
                            <button
                              key={r.key}
                              type="button"
                              disabled={outOfStock}
                              onClick={() => {
                                setManualItems((prev) => {
                                  const existing = prev.find((it) => it.product_id === p.id && (it.color || '') === (r.color || '') && (it.size || '') === (r.size || ''));
                                  if (existing) {
                                    return prev.map((it) => it === existing ? { ...it, quantity: it.quantity + 1 } : it);
                                  }
                                  return [...prev, {
                                    product_id: p.id,
                                    name: p.name,
                                    price: p.price,
                                    quantity: 1,
                                    product_code: p.product_code,
                                    sku: r.sku,
                                    image: r.image,
                                    color: r.color,
                                    size: r.size,
                                    variant_stock: r.stock,
                                  }];
                                });
                                setManualProductSearch("");
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary text-left border-b border-border last:border-b-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {r.image && (
                                <img src={r.image} alt="" className="w-10 h-10 rounded object-cover bg-secondary shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{p.name}</p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {r.color && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">{r.color}</span>}
                                  {r.size && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{r.size}</span>}
                                  <span className="text-[10px] text-muted-foreground">{r.sku || '—'}</span>
                                  <span className="text-[10px] text-muted-foreground">· {formatPrice(p.price)}</span>
                                </div>
                              </div>
                              {isVariant && (
                                <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${outOfStock ? 'bg-destructive/10 text-destructive' : (r.stock! <= 3 ? 'bg-amber-500/15 text-amber-600' : 'bg-green-500/10 text-green-600')}`}>
                                  {r.stock} ш
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {filtered.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-4">Илэрц олдсонгүй</p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    {manualItems.map((it, idx) => {
                      const isEditing = editingItemIdx === idx;
                      const updateItem = (patch: Partial<typeof it>) =>
                        setManualItems((prev) => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
                      return (
                      <div key={idx} className="bg-secondary/40 rounded-xl p-2">
                        <div className="flex items-center gap-2">
                          {it.image && <img src={it.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-secondary" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium truncate">{it.name}</p>
                              {it.is_custom && <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase">Гараар</span>}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {formatPrice(it.price)} × {it.quantity}
                              {(it.color || it.size) ? ` · ${[it.color, it.size].filter(Boolean).join(' / ')}` : ''}
                              {it.sku || it.product_code ? ` · ${it.sku || it.product_code}` : ''}
                              {it.variant_stock !== undefined ? ` · Үлд: ${it.variant_stock}ш` : ''}
                            </p>
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) => updateItem({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-16 rounded-lg bg-card border border-border px-2 py-1 text-xs text-center"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingItemIdx(isEditing ? null : idx)}
                            className={`p-1.5 rounded-lg ${isEditing ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                            title="Засах"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setManualItems((prev) => { const dup = { ...prev[idx] }; return [...prev, dup]; }); }}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                            title="Хувилах"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setManualItems((prev) => prev.filter((_, i) => i !== idx)); if (isEditing) setEditingItemIdx(null); }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {isEditing && (
                          <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-border">
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-muted-foreground">Барааны нэр</label>
                              <input
                                type="text"
                                value={it.name}
                                onChange={(e) => updateItem({ name: e.target.value })}
                                className="w-full rounded-lg bg-card border border-border px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground">Үнэ (₮)</label>
                              <input
                                type="number"
                                min={0}
                                value={it.price}
                                onChange={(e) => updateItem({ price: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-full rounded-lg bg-card border border-border px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground">SKU / Код</label>
                              <input
                                type="text"
                                value={it.sku || it.product_code || ""}
                                onChange={(e) => updateItem({ sku: e.target.value, product_code: e.target.value })}
                                className="w-full rounded-lg bg-card border border-border px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground">Өнгө</label>
                              <input
                                type="text"
                                value={it.color || ""}
                                onChange={(e) => updateItem({ color: e.target.value })}
                                className="w-full rounded-lg bg-card border border-border px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground">Хэмжээ</label>
                              <input
                                type="text"
                                value={it.size || ""}
                                onChange={(e) => updateItem({ size: e.target.value })}
                                className="w-full rounded-lg bg-card border border-border px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingItemIdx(null)}
                                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold"
                              >
                                Болсон
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                    {manualItems.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-4 border border-dashed border-border rounded-xl">
                        Дээрх хайлтаас бараа сонгоно уу
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 4 — Payment */}
              <section className="bg-card rounded-2xl border border-border overflow-hidden">
                <header className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 border-b border-border">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Төлбөр</h3>
                </header>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Төлбөрийн суваг</label>
                    <select
                      value={manualForm.payment_method}
                      onChange={(e) => setManualForm((f) => ({ ...f, payment_method: e.target.value }))}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="cash">Бэлнээр</option>
                      <option value="qpay">QPay</option>
                      <option value="storepay">Storepay</option>
                      <option value="transfer">Шилжүүлэг</option>
                      <option value="pocket">Pocket</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Төлөв <span className="font-normal text-muted-foreground/60">(төлбөр төлөгдсөн эсэх)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          value: "confirmed",
                          title: "Төлбөр авсан",
                          desc: "Бэлэн / шилжүүлэг хүлээн авсан",
                          active: manualForm.payment_status !== "unpaid",
                          accent: "text-emerald-600 border-emerald-500/40 bg-emerald-500/5",
                        },
                        {
                          value: "unpaid",
                          title: "Төлбөр аваагүй",
                          desc: "Хүргэлт дээр төлнө",
                          active: manualForm.payment_status === "unpaid",
                          accent: "text-amber-600 border-amber-500/40 bg-amber-500/5",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            if (opt.value === "unpaid") {
                              setManualForm((f) => ({ ...f, status: "pending", payment_status: "unpaid" }));
                            } else {
                              setManualForm((f) => ({ ...f, status: "confirmed", payment_status: "confirmed" }));
                            }
                          }}
                          className={`text-left rounded-xl border-2 px-3 py-2 transition-all ${
                            opt.active
                              ? `${opt.accent} font-semibold shadow-sm`
                              : "border-transparent bg-secondary text-foreground/70 hover:bg-secondary/70"
                          }`}
                        >
                          <div className="text-sm font-bold leading-tight">{opt.title}</div>
                          <div className="text-[11px] opacity-80 mt-0.5 leading-tight">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Захиалгын төлөв</label>
                    <select
                      value={manualForm.status}
                      onChange={(e) => setManualForm((f) => ({ ...f, status: e.target.value as any }))}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="pending">Хүлээгдэж буй</option>
                      <option value="phone_confirmed">Утсаар баталгаажуулсан</option>
                      <option value="confirmed">Төлбөр орсон</option>
                      <option value="preparing">Бэлдэж байна</option>
                      <option value="delivering">Хүргэлтэнд гарсан</option>
                      <option value="completed">Дууссан</option>
                      <option value="cancelled">Цуцлагдсан</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* SECTION 5 — Notes */}
              <section className="bg-card rounded-2xl border border-border overflow-hidden">
                <header className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 border-b border-border">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Нэмэлт тайлбар</h3>
                  <span className="text-[10px] text-muted-foreground">(заавал биш)</span>
                </header>
                <div className="p-4">
                  <textarea
                    rows={3}
                    value={manualForm.source_note}
                    onChange={(e) => setManualForm((f) => ({ ...f, source_note: e.target.value.slice(0, 500) }))}
                    placeholder="Жишээ: 14:00-аас өмнө хүргэх, утсаар яриад очих, бэлэг боох гэх мэт..."
                    className="w-full rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <div className="text-[10px] text-muted-foreground/60 text-right mt-1">{manualForm.source_note.length}/500</div>
                </div>
              </section>

              {/* SECTION 6 — Total */}
              <section className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/20 overflow-hidden">
                <header className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/10">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Нийт дүн</h3>
                </header>
                <div className="p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Бараа:</span><span className="font-medium">{formatPrice(manualSubtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Хүргэлт:</span><span className="font-medium">{formatPrice(Number(manualForm.delivery_fee) || 0)}</span></div>
                  <div className="flex justify-between border-t border-primary/20 pt-2 mt-2"><span className="font-bold text-base">Нийт:</span><span className="font-bold text-lg text-primary">{formatPrice(manualTotal)}</span></div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowManualOrder(false)}
                disabled={manualSubmitting}
                className="px-4 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                onClick={handleCreateManualOrder}
                disabled={manualSubmitting}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {manualSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Бүртгэх
              </button>
            </div>
          </div>
        </div>
      )}


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
            const active = item.id === "settings"
              ? (tab === "settings" || SETTINGS_TABS.includes(tab))
              : tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id === "settings" ? "categories" : item.id)}
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-full bg-secondary shrink-0 disabled:opacity-50"
              title="Мэдээлэл шинэчлэх"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full">{SETTINGS_TABS.includes(tab) ? settingsSubItems.find(s => s.id === tab)?.label : sidebarItems.find(s => s.id === tab)?.label}</span>
          </div>
        </header>
        <div className="sticky top-[52px] z-40 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex overflow-x-auto no-scrollbar gap-1 px-3 py-2">
            {sidebarItems.map((t) => {
              const Icon = t.icon;
              const active = t.id === "settings"
                ? (tab === "settings" || SETTINGS_TABS.includes(tab))
                : tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id === "settings" ? "categories" : t.id)}
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
            <h2 className="text-xl font-bold">
              {SETTINGS_TABS.includes(tab)
                ? `Ерөнхий тохиргоо · ${settingsSubItems.find(s => s.id === tab)?.label}`
                : sidebarItems.find(s => s.id === tab)?.label}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tab === "stats" && "Дэлгүүрийн ерөнхий мэдээлэл"}
              {tab === "tracking" && "Хяналт · Live зочин, hot lead, сэргээх"}
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
              {tab === "stocklog" && "Elle Sport нөөцөөс хасагдсан түүх"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
              title="Мэдээлэл шинэчлэх"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Шинэчлэх</span>
            </button>
            {tab === "products" && (
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" /> Бараа нэмэх
              </button>
            )}
          </div>
        </div>

        {/* Settings sub-tab bar */}
        {SETTINGS_TABS.includes(tab) && (
          <div className="sticky top-0 md:top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="flex overflow-x-auto no-scrollbar gap-1 px-3 md:px-8 py-2">
              {settingsSubItems.map((s) => {
                const Icon = s.icon;
                const active = tab === s.id;
                return (
                  <button key={s.id} onClick={() => setTab(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground bg-secondary/60 hover:bg-secondary"
                    }`}>
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 max-w-5xl relative">
          {refreshing && (
            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
              <AdminSkeleton tab={tab} />
            </div>
          )}
          {/* Stats */}
          {tab === "stats" && (
            <div className="space-y-6">
              {/* Орлого */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold tracking-tight">Орлого</h2>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Баталгаажсан захиалга</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {[
                    { label: "Нийт орлого", value: formatPrice(totalRevenue), icon: BarChart3, color: "bg-amber-500/10 text-amber-600", tab: "orders" as Tab },
                    { label: "Хүргэлтийн орлого", value: formatPrice(totalDeliveryRevenue), icon: BarChart3, color: "bg-cyan-500/10 text-cyan-600", tab: "orders" as Tab },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div key={i} onClick={() => setTab(stat.tab)} className="bg-card rounded-2xl p-4 md:p-6 border border-border cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.98]">
                        <div className={`h-9 w-9 md:h-10 md:w-10 rounded-xl ${stat.color} flex items-center justify-center mb-3 md:mb-4`}>
                          <Icon className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-xl md:text-2xl font-extrabold">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Хэмжээ */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold tracking-tight">Үйл ажиллагаа</h2>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Нийт тоо</span>
                </div>
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  {[
                    { label: "Бараа", value: products.length, icon: Package, color: "bg-blue-500/10 text-blue-600", tab: "products" as Tab },
                    { label: "Захиалга", value: orders.length, icon: ShoppingBag, color: "bg-green-500/10 text-green-600", tab: "orders" as Tab },
                    { label: "Хэрэглэгч", value: users.length, icon: Users, color: "bg-purple-500/10 text-purple-600", tab: "users" as Tab },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div key={i} onClick={() => setTab(stat.tab)} className="bg-card rounded-2xl p-3 md:p-5 border border-border cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.98]">
                        <div className={`h-8 w-8 md:h-9 md:w-9 rounded-lg ${stat.color} flex items-center justify-center mb-2 md:mb-3`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                        <p className="text-base md:text-xl font-extrabold">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
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

              {/* Bulk discount bar */}
              {productSelected.size > 0 && (
                <div className="bg-card rounded-2xl border border-primary/30 p-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                  <div className="text-sm font-semibold flex-1 min-w-[140px]">
                    {productSelected.size} бараа сонгосон
                  </div>
                  <div className="inline-flex rounded-lg bg-secondary p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setBulkDiscountMode("pct")}
                      className={`px-3 py-1.5 rounded-md font-medium transition ${bulkDiscountMode === "pct" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >Хувиар %</button>
                    <button
                      type="button"
                      onClick={() => setBulkDiscountMode("amt")}
                      className={`px-3 py-1.5 rounded-md font-medium transition ${bulkDiscountMode === "amt" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >Төгрөгөөр ₮</button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {bulkDiscountMode === "pct" ? (
                      <>
                        <label className="text-xs text-muted-foreground">Хямдрал %:</label>
                        <input
                          type="number" min={0} max={99} placeholder="0"
                          value={bulkDiscountPct || ""}
                          onChange={(e) => setBulkDiscountPct(Math.max(0, Math.min(99, +e.target.value || 0)))}
                          className="w-20 rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </>
                    ) : (
                      <>
                        <label className="text-xs text-muted-foreground">Хасах ₮:</label>
                        <input
                          type="number" min={0} step={500} placeholder="0"
                          value={bulkDiscountAmt || ""}
                          onChange={(e) => setBulkDiscountAmt(Math.max(0, +e.target.value || 0))}
                          className="w-28 rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </>
                    )}
                    <button
                      onClick={handleApplyBulkDiscount}
                      disabled={bulkDiscountLoading}
                      className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                      {bulkDiscountLoading
                        ? "Тооцож байна..."
                        : bulkDiscountMode === "pct"
                          ? (bulkDiscountPct > 0 ? `${bulkDiscountPct}% хэрэглэх` : "Хямдрал хасах")
                          : (bulkDiscountAmt > 0 ? `${bulkDiscountAmt.toLocaleString()}₮ хасах` : "Хямдрал хасах")}
                    </button>
                    <button
                      onClick={() => { setProductSelected(new Set()); setBulkDiscountPct(0); setBulkDiscountAmt(0); }}
                      className="bg-secondary rounded-lg px-3 py-2 text-xs font-medium hover:bg-secondary/80"
                    >
                      Цуцлах
                    </button>
                  </div>
                </div>
              )}

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
                      <input type="number" placeholder="0" value={form.discount || ""} onChange={(e) => {
                        const pct = Math.max(0, Math.min(99, +e.target.value || 0));
                        const base = (form.original_price && form.original_price > 0) ? form.original_price : form.price;
                        if (pct > 0) {
                          const newPrice = Math.round(base * (1 - pct / 100));
                          setForm({ ...form, discount: pct, price: newPrice, original_price: base, is_on_sale: true });
                        } else {
                          setForm({ ...form, discount: 0, is_on_sale: false });
                        }
                      }}
                        className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      {form.discount > 0 && form.original_price > 0 && (
                        <p className="text-[10px] text-destructive font-semibold mt-1">
                          Шинэ үнэ: {formatPrice(form.price)} <span className="text-muted-foreground line-through font-normal ml-1">{formatPrice(form.original_price)}</span>
                        </p>
                      )}
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

                  {(() => {
                    const b = dbBrands.find((x: any) => x.id === form.brand_id);
                    const norm = (b?.name || "").toLowerCase().replace(/\s+/g, "");
                    if (!(norm.includes("elle") && norm.includes("sport"))) return null;

                    const validColors = form.colors.filter(c => c.name.trim());
                    const validSizes = form.sizes.filter(s => s.trim());
                    const colorList = validColors.length > 0 ? validColors.map(c => c.name) : [""];
                    const sizeList = validSizes.length > 0 ? validSizes : [""];

                    const total = colorList.reduce((sum, c) => sum + sizeList.reduce((s2, s) => s2 + (Number(form.variant_stock?.[`${c}|${s}`]) || 0), 0), 0);

                    return (
                      <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-foreground">
                            Үлдэгдэл (өнгө × хэмжээ)
                          </label>
                          <span className="text-[11px] text-muted-foreground">Нийт: <span className="font-bold text-foreground">{total}</span></span>
                        </div>
                        {(validColors.length === 0 && validSizes.length === 0) ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={0} placeholder="0"
                              value={form.variant_stock?.["|"] || ""}
                              onChange={(e) => setForm({ ...form, variant_stock: { ...form.variant_stock, ["|"]: Math.max(0, +e.target.value || 0) } })}
                              className="w-32 rounded-lg bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-xs text-muted-foreground">ширхэг</span>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr>
                                  <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Өнгө \ Хэмжээ</th>
                                  {sizeList.map((s) => (
                                    <th key={s} className="text-center py-1 px-1 font-medium text-muted-foreground min-w-[60px]">{s || "—"}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {colorList.map((c) => (
                                  <tr key={c}>
                                    <td className="py-1 pr-2 text-foreground font-medium">{c || "—"}</td>
                                    {sizeList.map((s) => {
                                      const key = `${c}|${s}`;
                                      return (
                                        <td key={s} className="py-1 px-1">
                                          <input
                                            type="number" min={0} placeholder="0"
                                            value={form.variant_stock?.[key] || ""}
                                            onChange={(e) => setForm({ ...form, variant_stock: { ...form.variant_stock, [key]: Math.max(0, +e.target.value || 0) } })}
                                            className="w-full rounded-md bg-background px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">Зөвхөн Elle Sport брэнд дээр харагдана. Өнгө/хэмжээ нэмсний дараа автоматаар бүх хослолд нүд гарч ирнэ.</p>
                      </div>
                    );
                  })()}

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
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.has_gift}
                        onChange={(e) => setForm({
                          ...form,
                          has_gift: e.target.checked,
                          gift_packages: e.target.checked
                            ? (form.gift_packages.length > 0 ? form.gift_packages : [{ id: crypto.randomUUID(), name: "Багц 1", items: [] }])
                            : [],
                        })}
                        className="rounded"
                      />
                      🎁 Бэлэгтэй
                    </label>
                  </div>
                  {form.has_gift && (
                    <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">🎁 Бэлгийн багцууд ({form.gift_packages.length})</div>
                        <button
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            gift_packages: [...form.gift_packages, { id: crypto.randomUUID(), name: `Багц ${form.gift_packages.length + 1}`, items: [] }],
                          })}
                          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Багц нэмэх
                        </button>
                      </div>

                      {form.gift_packages.length === 0 && (
                        <p className="text-xs text-muted-foreground">Дээрх товчоор бэлгийн багц нэмнэ үү.</p>
                      )}

                      {form.gift_packages.map((pkg, pkgIdx) => (
                        <div key={pkg.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={pkg.name}
                              onChange={(e) => {
                                const next = [...form.gift_packages];
                                next[pkgIdx] = { ...pkg, name: e.target.value };
                                setForm({ ...form, gift_packages: next });
                              }}
                              placeholder="Багцын нэр"
                              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-[10px] text-muted-foreground">{pkg.items.length} зүйл</span>
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, gift_packages: form.gift_packages.filter((_, i) => i !== pkgIdx) })}
                              className="text-xs px-2 py-1 rounded-md border border-border hover:bg-destructive hover:text-destructive-foreground"
                              aria-label="Багц устгах"
                            >
                              ✕ Багц
                            </button>
                          </div>

                          {pkg.items.length > 0 && (
                            <div className="space-y-1.5">
                              {pkg.items.map((g, idx) => (
                                <div key={`${g.product_id}-${idx}`} className="flex items-center gap-2 p-1.5 rounded-md bg-secondary/40 border border-border">
                                  <span className="text-xs text-muted-foreground w-5 text-center">{idx + 1}.</span>
                                  {g.image ? (
                                    <img src={g.image} alt={g.name} className="w-8 h-8 rounded object-cover border border-border" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-base">🎁</div>
                                  )}
                                  <span className="flex-1 text-xs truncate">{g.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...form.gift_packages];
                                      next[pkgIdx] = { ...pkg, items: pkg.items.filter((_, i) => i !== idx) };
                                      setForm({ ...form, gift_packages: next });
                                    }}
                                    className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div>
                            <input
                              type="text"
                              value={giftSearch.pkgId === pkg.id ? giftSearch.q : ""}
                              onFocus={() => setGiftSearch({ pkgId: pkg.id, q: giftSearch.pkgId === pkg.id ? giftSearch.q : "" })}
                              onChange={(e) => setGiftSearch({ pkgId: pkg.id, q: e.target.value })}
                              placeholder="Энэ багцад бараа нэмэх (нэр эсвэл код хайх)..."
                              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {giftSearch.pkgId === pkg.id && giftSearch.q.trim().length >= 1 && (
                              <div className="mt-1.5 max-h-48 overflow-auto rounded-md border border-border bg-background divide-y divide-border">
                                {products
                                  .filter((p: any) => {
                                    if (editId && p.id === editId) return false;
                                    if (pkg.items.some(x => x.product_id === p.id)) return false;
                                    const q = giftSearch.q.trim().toLowerCase();
                                    return (p.name || "").toLowerCase().includes(q) || (p.product_code || "").toLowerCase().includes(q);
                                  })
                                  .slice(0, 20)
                                  .map((p: any) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        const next = [...form.gift_packages];
                                        next[pkgIdx] = {
                                          ...pkg,
                                          items: [...pkg.items, { product_id: p.id, name: p.name, image: p.thumbnail_url || p.image_url || "" }],
                                        };
                                        setForm({ ...form, gift_packages: next });
                                        setGiftSearch({ pkgId: pkg.id, q: "" });
                                      }}
                                      className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-secondary"
                                    >
                                      <img src={p.thumbnail_url || p.image_url || "/placeholder.svg"} alt={p.name} className="w-7 h-7 rounded object-cover" />
                                      <span className="flex-1 text-xs truncate">{p.name}</span>
                                      {p.product_code && <span className="text-[10px] text-muted-foreground">{p.product_code}</span>}
                                    </button>
                                  ))}
                                {products.filter((p: any) => {
                                  if (editId && p.id === editId) return false;
                                  if (pkg.items.some(x => x.product_id === p.id)) return false;
                                  const q = giftSearch.q.trim().toLowerCase();
                                  return (p.name || "").toLowerCase().includes(q) || (p.product_code || "").toLowerCase().includes(q);
                                }).length === 0 && (
                                  <div className="p-2 text-[11px] text-muted-foreground text-center">Илэрц олдсонгүй</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                        <th className="px-3 py-4 w-8">
                          <input
                            type="checkbox"
                            checked={filteredProducts.length > 0 && filteredProducts.every((p: any) => productSelected.has(p.id))}
                            onChange={(e) => {
                              const next = new Set(productSelected);
                              if (e.target.checked) filteredProducts.forEach((p: any) => next.add(p.id));
                              else filteredProducts.forEach((p: any) => next.delete(p.id));
                              setProductSelected(next);
                            }}
                            className="rounded cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Бараа</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Ангилал</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Үнэ</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Хямдрал</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${p.is_active === false ? "opacity-50" : ""} ${productSelected.has(p.id) ? "bg-primary/5" : ""}`}>
                          <td className="px-3 py-4">
                            <input
                              type="checkbox"
                              checked={productSelected.has(p.id)}
                              onChange={(e) => {
                                const next = new Set(productSelected);
                                if (e.target.checked) next.add(p.id); else next.delete(p.id);
                                setProductSelected(next);
                              }}
                              className="rounded cursor-pointer"
                            />
                          </td>
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
                              <a
                                href={`/admin?tab=products&edit=${p.id}`}
                                onClick={(e) => {
                                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                                  e.preventDefault();
                                  setSearchParams({ tab: "products", edit: p.id });
                                  handleEditProduct(p);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="p-2 rounded-lg hover:bg-secondary transition-colors inline-flex" title="Засах">
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </a>
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
                  <div key={p.id} className={`flex items-center gap-3 bg-card rounded-xl p-3 border border-border ${p.is_active === false ? "opacity-50" : ""} ${productSelected.has(p.id) ? "ring-2 ring-primary/40" : ""}`}>
                    <input
                      type="checkbox"
                      checked={productSelected.has(p.id)}
                      onChange={(e) => {
                        const next = new Set(productSelected);
                        if (e.target.checked) next.add(p.id); else next.delete(p.id);
                        setProductSelected(next);
                      }}
                      className="rounded cursor-pointer shrink-0"
                    />
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
                    <a
                      href={`/admin?tab=products&edit=${p.id}`}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                        e.preventDefault();
                        setSearchParams({ tab: "products", edit: p.id });
                        handleEditProduct(p);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-2 rounded-lg bg-secondary inline-flex" title="Засах"><Pencil className="h-3.5 w-3.5" /></a>
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
              {/* Manual external order */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Facebook, утас гэх мэт сувгаар орж ирсэн борлуулалтыг "Захиалга оруулах" товчоор бүртгэнэ үү.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    title="Захиалга шинэчлэх"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Шинэчлэх
                  </button>
                  <button
                    onClick={() => { resetManualForm(); setShowManualOrder(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" />
                    Захиалга оруулах
                  </button>
                </div>
              </div>

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

              {/* Recently cancelled orders */}
              {(() => {
                const recentCancelled = orders
                  .filter((o: any) => o.status === "cancelled")
                  .slice(0, 5);
                if (recentCancelled.length === 0) return null;
                return (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setShowCancelledRecent((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🗑️</span>
                        <span className="text-sm font-bold">Сүүлд цуцлагдсан захиалгууд</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                          {recentCancelled.length}
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCancelledRecent ? "rotate-180" : ""}`} />
                    </button>
                    {showCancelledRecent && (
                      <div className="border-t border-border divide-y divide-border">
                        {recentCancelled.map((o: any) => (
                          <div key={o.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold">{o.order_ref || o.id.slice(0, 8)}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(o.updated_at || o.created_at).toLocaleString("mn-MN")}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {o.guest_name || "—"} · {o.phone || "—"} · {(o.total || 0).toLocaleString()}₮
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateOrderStatus(o.id, "pending")}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                                title="Хүлээгдэж буй төлөвт буцаах"
                              >
                                Сэргээх
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => setDeleteOrderTarget({ id: o.id })}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                  title="Бүрмөсөн устгах"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

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

                const handleSelectedXlsx = () => {
                  const chosen = orders.filter((o: any) => bulkSelected.has(o.id));
                  if (chosen.length === 0) {
                    toast.error("Захиалга сонгоно уу");
                    return;
                  }
                  try {
                    const fields = loadPrintFields();
                    const rows = buildSelectedOrdersXlsxRows(chosen, fields);
                    const ws = XLSX.utils.json_to_sheet(rows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Orders");
                    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
                    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                    const d = new Date();
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
                    downloadBlob(blob, `orders-selected-${chosen.length}-${stamp}.xlsx`);
                    toast.success(`${chosen.length} захиалгыг Excel-д татлаа`);
                  } catch (e) {
                    console.error(e);
                    toast.error("Excel үүсгэхэд алдаа гарлаа");
                  }
                };

                const handlePrintSelected = async () => {
                  const chosen = orders.filter((o: any) => bulkSelected.has(o.id));
                  if (chosen.length === 0) {
                    toast.error("Захиалга сонгоно уу");
                    return;
                  }
                  const fields = loadPrintFields();
                  if (!fields.some((f) => f.enabled)) {
                    toast.error("Хэвлэх багана сонгогдоогүй байна. Тохиргоо хэсгээс идэвхжүүлнэ үү.");
                    return;
                  }
                  const t = toast.loading("Хэвлэх хуудас бэлдэж байна…");
                  try {
                    await printOrdersTable(chosen, fields);
                    toast.success("Бэлэн боллоо", { id: t });
                  } catch (e) {
                    console.error(e);
                    toast.error("Хэвлэхэд алдаа гарлаа", { id: t });
                  }
                };

                return (
                  <>
                    {/* Bulk action bar */}
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
                          <span className="text-xs font-semibold text-primary">
                            {bulkSelected.size} захиалга сонгосон
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleSelectedXlsx}
                            disabled={bulkSelected.size === 0}
                            className="gap-1.5"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Excel татах ({bulkSelected.size})
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const chosen = orders.filter((o: any) => bulkSelected.has(o.id));
                              if (chosen.length === 0) { toast.error("Захиалга сонгоно уу"); return; }
                              const t = toast.loading("PDF бэлдэж байна…");
                              try {
                                await downloadOrderLabelsPdf(chosen as any, `orders-${new Date().toISOString().slice(0,10)}.pdf`);
                                // Mark downloaded orders as "preparing" (Бэлдэж байна)
                                const idsToUpdate = chosen
                                  .filter((o: any) => o.status !== "preparing" && o.status !== "delivering" && o.status !== "completed" && o.status !== "cancelled")
                                  .map((o: any) => o.id);
                                if (idsToUpdate.length > 0) {
                                  const { error: upErr } = await supabase
                                    .from("orders")
                                    .update({ status: "preparing", updated_at: new Date().toISOString() })
                                    .in("id", idsToUpdate);
                                  if (upErr) {
                                    console.error(upErr);
                                    toast.error("Төлөв шинэчлэхэд алдаа гарлаа");
                                  } else {
                                    setOrders((prev: any) => prev.map((o: any) => idsToUpdate.includes(o.id) ? { ...o, status: "preparing" } : o));
                                  }
                                }
                                toast.success(`PDF татагдлаа${idsToUpdate.length > 0 ? ` · ${idsToUpdate.length} захиалга "Бэлдэж байна" болсон` : ""}`, { id: t });
                              } catch (e) {
                                console.error(e);
                                toast.error("PDF үүсгэхэд алдаа гарлаа", { id: t });
                              }
                            }}
                            disabled={bulkSelected.size === 0}
                            className="gap-1.5"
                            title="Сонгосон захиалгуудыг 70x80mm босоо PDF (хаяг + утас + бараа) болгож татах"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            PDF татах ({bulkSelected.size})
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handlePrintSelected}
                            disabled={bulkSelected.size === 0}
                            className="gap-1.5"
                          >
                            <Printer className="h-4 w-4" />
                            Сонгосноо хэвлэх ({bulkSelected.size})
                          </Button>
                          <NiimbotBulkXlsxButton onExport={handleBulkXlsx} count={bulkSelected.size} />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowPrintSettings((v) => !v)}
                            className="gap-1.5"
                            title="Хэвлэх тохиргоо"
                          >
                            <Settings className="h-4 w-4" />
                            Тохиргоо
                          </Button>
                        </div>
                      </div>
                      {showPrintSettings && (
                        <div className="pt-2 border-t border-border">
                          <PrintFieldsSettings />
                        </div>
                      )}
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
                          {o.source && o.source !== "web" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600">
                              {o.source === "facebook" ? "📘 Facebook" :
                               o.source === "phone" ? "📞 Утас" :
                               o.source === "instagram" ? "📷 Instagram" :
                               o.source === "store" ? "🏬 Дэлгүүр" : "Бусад"}
                            </span>
                          )}
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
                        {o.status === "cancelled" && isAdmin && (
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
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-muted-foreground">Захиалсан бараанууд</h4>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => saveOrderItems(o.id)}
                                disabled={savingOrderItems === o.id}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                              >
                                {savingOrderItems === o.id ? "Хадгалж байна..." : "Хадгалах"}
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {orderItems.map((item: any, idx: number) => {
                              const isEditingItem = editingOrderItem?.orderId === o.id && editingOrderItem?.idx === idx;
                              const upd = (patch: Record<string, any>) => updateOrderItemLocal(o.id, idx, patch);
                              return (
                              <div key={idx} className="bg-secondary/30 rounded-lg p-2">
                                <div className="flex items-center gap-3">
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
                                  {isAdmin && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOrderItem(isEditingItem ? null : { orderId: o.id, idx })}
                                        className={`p-1.5 rounded-lg ${isEditingItem ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                                        title="Засах"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { removeOrderItemLocal(o.id, idx); if (isEditingItem) setEditingOrderItem(null); }}
                                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                                        title="Хасах"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                {isAdmin && isEditingItem && (
                                  <div className="mt-2 space-y-2 pt-2 border-t border-border">
                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground">Системээс бараа сонгох</label>
                                      <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                          type="text"
                                          value={orderItemSearch}
                                          onChange={(e) => setOrderItemSearch(e.target.value)}
                                          placeholder="Бараа хайх (нэр / SKU)..."
                                          className="w-full rounded-lg bg-card border border-border pl-8 pr-3 py-1.5 text-xs"
                                        />
                                      </div>
                                      {orderItemSearch.trim() && (() => {
                                        const q = orderItemSearch.toLowerCase();
                                        type Row = { key: string; product: any; color?: string; size?: string; sku?: string; image?: string; stock?: number; };
                                        const rows: Row[] = [];
                                        for (const p of products) {
                                          const vs = (p.variant_stock && typeof p.variant_stock === 'object') ? p.variant_stock : {};
                                          const colors: any[] = Array.isArray(p.colors) ? p.colors : [];
                                          const variantKeys = Object.keys(vs);
                                          if (variantKeys.length > 0) {
                                            for (const key of variantKeys) {
                                              const [color, size] = key.split('|');
                                              const cmeta = colors.find((c: any) => (c?.name || '').trim() === (color || '').trim());
                                              const sku = cmeta?.sku || p.product_code || '';
                                              const image = cmeta?.image || p.thumbnail_url || p.image_url;
                                              rows.push({ key: `${p.id}|${key}`, product: p, color, size, sku, image, stock: Number(vs[key]) || 0 });
                                            }
                                          } else {
                                            rows.push({ key: p.id, product: p, sku: p.product_code, image: p.thumbnail_url || p.image_url, stock: p.stock_quantity });
                                          }
                                        }
                                        const filtered = rows.filter((r) => `${r.product.name} ${r.sku || ''} ${r.color || ''} ${r.size || ''}`.toLowerCase().includes(q)).slice(0, 30);
                                        return (
                                          <div className="mt-1 border border-border rounded-lg max-h-56 overflow-y-auto bg-card">
                                            {filtered.map((r) => (
                                              <button
                                                key={r.key}
                                                type="button"
                                                onClick={() => {
                                                  upd({
                                                    product_id: r.product.id,
                                                    name: r.product.name,
                                                    price: r.product.price,
                                                    product_code: r.sku || r.product.product_code,
                                                    sku: r.sku || r.product.product_code,
                                                    image: r.image,
                                                    color: r.color || "",
                                                    size: r.size || "",
                                                  });
                                                  setOrderItemSearch("");
                                                }}
                                                className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-secondary/60 border-b border-border last:border-b-0"
                                              >
                                                {r.image && <img src={r.image} alt="" className="w-8 h-8 rounded object-cover bg-secondary" />}
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-xs font-medium truncate">{r.product.name}</p>
                                                  <p className="text-[10px] text-muted-foreground truncate">
                                                    {[r.color, r.size].filter(Boolean).join(' / ')}
                                                    {r.sku ? ` · ${r.sku}` : ''}
                                                    {r.stock !== undefined ? ` · Үлд: ${r.stock}` : ''}
                                                  </p>
                                                </div>
                                                <span className="text-[10px] font-bold">{formatPrice(r.product.price)}</span>
                                              </button>
                                            ))}
                                            {filtered.length === 0 && (
                                              <p className="text-center text-[11px] text-muted-foreground py-3">Илэрц олдсонгүй</p>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground">Үнэ (₮)</label>
                                        <input type="number" min={0} value={item.price ?? 0} onChange={(e) => upd({ price: Math.max(0, Number(e.target.value) || 0) })}
                                          className="w-full rounded-lg bg-card border border-border px-2 py-1.5 text-xs" />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground">Тоо</label>
                                        <input type="number" min={1} value={item.quantity ?? 1} onChange={(e) => upd({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                                          className="w-full rounded-lg bg-card border border-border px-2 py-1.5 text-xs" />
                                      </div>
                                    </div>
                                    <div className="flex justify-end">
                                      <button type="button" onClick={() => { setEditingOrderItem(null); setOrderItemSearch(""); }}
                                        className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-[11px] font-semibold">
                                        Болсон
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              );
                            })}
                          </div>
                          {/* Add new item */}
                          {isAdmin && (
                            <div className="mt-2">
                              {addingItemToOrderId === o.id ? (
                                <div className="bg-secondary/30 rounded-lg p-2 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-semibold text-muted-foreground">Шинэ бараа нэмэх</label>
                                    <button type="button" onClick={() => { setAddingItemToOrderId(null); setAddItemSearch(""); }} className="text-[10px] text-muted-foreground hover:text-foreground">Болих</button>
                                  </div>
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <input
                                      type="text"
                                      value={addItemSearch}
                                      onChange={(e) => setAddItemSearch(e.target.value)}
                                      placeholder="Бараа хайх (нэр / SKU / өнгө / хэмжээ)..."
                                      autoFocus
                                      className="w-full rounded-lg bg-card border border-border pl-8 pr-3 py-1.5 text-xs"
                                    />
                                  </div>
                                  {addItemSearch.trim() && (() => {
                                    const q = addItemSearch.toLowerCase();
                                    type Row = { key: string; product: any; color?: string; size?: string; sku?: string; image?: string; stock?: number; };
                                    const rows: Row[] = [];
                                    for (const p of products) {
                                      const vs = (p.variant_stock && typeof p.variant_stock === 'object') ? p.variant_stock : {};
                                      const colors: any[] = Array.isArray(p.colors) ? p.colors : [];
                                      const variantKeys = Object.keys(vs);
                                      if (variantKeys.length > 0) {
                                        for (const key of variantKeys) {
                                          const [color, size] = key.split('|');
                                          const cmeta = colors.find((c: any) => (c?.name || '').trim() === (color || '').trim());
                                          const sku = cmeta?.sku || p.product_code || '';
                                          const image = cmeta?.image || p.thumbnail_url || p.image_url;
                                          rows.push({ key: `${p.id}|${key}`, product: p, color, size, sku, image, stock: Number(vs[key]) || 0 });
                                        }
                                      } else {
                                        rows.push({ key: p.id, product: p, sku: p.product_code, image: p.thumbnail_url || p.image_url, stock: p.stock_quantity });
                                      }
                                    }
                                    const filtered = rows.filter((r) => `${r.product.name} ${r.sku || ''} ${r.color || ''} ${r.size || ''}`.toLowerCase().includes(q)).slice(0, 30);
                                    return (
                                      <div className="border border-border rounded-lg max-h-56 overflow-y-auto bg-card">
                                        {filtered.map((r) => (
                                          <button
                                            key={r.key}
                                            type="button"
                                            onClick={() => {
                                              addOrderItemLocal(o.id, {
                                                product_id: r.product.id,
                                                name: r.product.name,
                                                price: r.product.price,
                                                quantity: 1,
                                                product_code: r.sku || r.product.product_code,
                                                sku: r.sku || r.product.product_code,
                                                image: r.image,
                                                color: r.color || "",
                                                size: r.size || "",
                                              });
                                              setAddItemSearch("");
                                            }}
                                            className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-secondary/60 border-b border-border last:border-b-0"
                                          >
                                            {r.image && <img src={r.image} alt="" className="w-8 h-8 rounded object-cover bg-secondary" />}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium truncate">{r.product.name}</p>
                                              <p className="text-[10px] text-muted-foreground truncate">
                                                {[r.color, r.size].filter(Boolean).join(' / ')}
                                                {r.sku ? ` · ${r.sku}` : ''}
                                                {r.stock !== undefined ? ` · Үлд: ${r.stock}` : ''}
                                              </p>
                                            </div>
                                            <span className="text-[10px] font-bold">{formatPrice(r.product.price)}</span>
                                          </button>
                                        ))}
                                        {filtered.length === 0 && (
                                          <p className="text-center text-[11px] text-muted-foreground py-3">Илэрц олдсонгүй</p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setAddingItemToOrderId(o.id); setAddItemSearch(""); }}
                                  className="w-full text-[11px] font-semibold px-3 py-2 rounded-lg border border-dashed border-border hover:bg-secondary/50 text-muted-foreground"
                                >
                                  + Бараа нэмэх
                                </button>
                              )}
                            </div>
                          )}
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
          {tab === "users" && (() => {
            const q = userSearch.trim().toLowerCase();
            const filteredUsers = !q ? users : users.filter((u: any) => {
              return (
                (u.full_name || "").toLowerCase().includes(q) ||
                (u.email || "").toLowerCase().includes(q) ||
                (u.phone || "").toLowerCase().includes(q)
              );
            });
            return (
            <div>
              {/* Search bar */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Нэр, имэйл, утсаар хайх..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Цэвэрлэх
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{filteredUsers.length} / {users.length} хэрэглэгч</p>

              <div className="hidden md:block">
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Хэрэглэгч</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Имэйл</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Утас</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Эрх</th>
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Бүртгүүлсэн</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u: any) => {
                        const userRoles: string[] = u.roles || [];
                        const roleOptions: { key: "admin" | "moderator" | "driver"; label: string; cls: string }[] = [
                          { key: "admin", label: "Админ", cls: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
                          { key: "moderator", label: "Борлуулагч", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
                          { key: "driver", label: "Жолооч", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
                        ];
                        return (
                          <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                  {(u.full_name || u.email || "?")[0].toUpperCase()}
                                </div>
                                <span className="text-sm font-medium">{u.full_name || "Нэргүй"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {u.email ? (
                                <a href={`mailto:${u.email}`} className="hover:text-foreground hover:underline">{u.email}</a>
                              ) : "—"}
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {u.phone ? (
                                <a href={`tel:${u.phone}`} className="hover:text-foreground hover:underline">{u.phone}</a>
                              ) : "—"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {roleOptions.map((r) => {
                                  const active = userRoles.includes(r.key);
                                  return (
                                    <button
                                      key={r.key}
                                      onClick={() => toggleUserRole(u.user_id, r.key, active)}
                                      className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                                        active ? r.cls : "bg-secondary text-muted-foreground border-transparent hover:border-border"
                                      }`}
                                      title={active ? `${r.label} эрхийг хасах` : `${r.label} эрх өгөх`}
                                    >
                                      {active ? "✓ " : "+ "}{r.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString("mn-MN")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && !loading && (
                    <p className="text-center text-sm text-muted-foreground py-12">
                      {q ? "Хайлтад тохирох хэрэглэгч олдсонгүй" : "Хэрэглэгч байхгүй"}
                    </p>
                  )}
                </div>
              </div>
              <div className="md:hidden space-y-2">
                {filteredUsers.map((u: any) => {
                  const userRoles: string[] = u.roles || [];
                  const roleOptions: { key: "admin" | "moderator" | "driver"; label: string; cls: string }[] = [
                    { key: "admin", label: "Админ", cls: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
                    { key: "moderator", label: "Борлуулагч", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
                    { key: "driver", label: "Жолооч", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
                  ];
                  return (
                    <div key={u.id} className="bg-card rounded-xl p-3 border border-border space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
                          {(u.full_name || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{u.full_name || "Нэргүй"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email || "Имэйл байхгүй"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.phone || "Утас байхгүй"}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{new Date(u.created_at).toLocaleDateString("mn-MN")}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
                        {roleOptions.map((r) => {
                          const active = userRoles.includes(r.key);
                          return (
                            <button
                              key={r.key}
                              onClick={() => toggleUserRole(u.user_id, r.key, active)}
                              className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                                active ? r.cls : "bg-secondary text-muted-foreground border-transparent"
                              }`}
                            >
                              {active ? "✓ " : "+ "}{r.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && !loading && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {q ? "Хайлтад тохирох хэрэглэгч олдсонгүй" : "Хэрэглэгч байхгүй"}
                  </p>
                )}
              </div>
            </div>
            );
          })()}

          {/* Visitor & Lead Tracking */}
          {tab === "tracking" && <TrackingDashboard />}

          {/* Web Analytics */}
          {tab === "analytics" && <WebAnalytics />}

          {/* Collections / Багц линк */}
          {tab === "collections" && <CollectionsManager products={products} />}

          {/* Chatbot settings */}
          {tab === "chatbot" && <ChatbotSettingsManager />}

          {/* Recommendation scoring weights */}
          {tab === "recommendations" && <RecommendationSettingsManager />}


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

          {/* Stock Deduction Log Tab */}
          {tab === "stocklog" && <StockDeductionLog />}

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
                      <button onClick={() => openBrandOrderModal({ id: b.id, name: b.name })}
                        title="Барааны дараалал"
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Layers className="h-4 w-4" />
                      </button>
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

          {orderingBrand && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !brandOrderSaving && setOrderingBrand(null)}>
              <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-bold text-sm">"{orderingBrand.name}" — барааны дараалал</h3>
                  <button onClick={() => setOrderingBrand(null)} className="p-2 rounded-lg hover:bg-secondary">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {brandOrderLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Уншиж байна...
                    </div>
                  ) : brandOrderItems.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Бараа байхгүй</p>
                  ) : (
                    brandOrderItems.map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-3 bg-secondary rounded-xl p-2">
                        <span className="w-7 text-center text-xs font-bold text-muted-foreground">{idx + 1}</span>
                        {(p.thumbnail_url || p.image_url) ? (
                          <img src={p.thumbnail_url || p.image_url || ""} alt={p.name} className="h-10 w-10 rounded-lg object-cover bg-background" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <p className="flex-1 text-sm truncate">{p.name}</p>
                        <div className="flex gap-1">
                          <button disabled={idx === 0} onClick={() => moveBrandOrderItem(idx, -1)}
                            className="p-1.5 rounded-lg bg-card hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold w-8">↑</button>
                          <button disabled={idx === brandOrderItems.length - 1} onClick={() => moveBrandOrderItem(idx, 1)}
                            className="p-1.5 rounded-lg bg-card hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold w-8">↓</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                  <button onClick={() => setOrderingBrand(null)} disabled={brandOrderSaving}
                    className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                    Болих
                  </button>
                  <button onClick={saveBrandOrder} disabled={brandOrderSaving || brandOrderLoading || brandOrderItems.length === 0}
                    className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center gap-2">
                    {brandOrderSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Хадгалах
                  </button>
                </div>
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

              {/* ADS Images Section */}
              <div className="border-t border-border pt-6">
                <h3 className="font-bold text-base mb-4">ADS зургууд (Баннер болон барааны дунд)</h3>
                <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
                  <h4 className="font-bold text-sm">{editAdId ? "ADS засах" : "Шинэ ADS нэмэх"}</h4>
                  {(() => {
                    const linkCheck = validateAdLinkUrl(adForm.link_url);
                    const linkErr = !linkCheck.ok ? (linkCheck as { error: string }).error : null;
                    return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <input placeholder="Холбоос URL (заавал биш) — /shop эсвэл https://..." value={adForm.link_url} maxLength={500}
                        onChange={(e) => setAdForm(f => ({ ...f, link_url: e.target.value }))}
                        className={`w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 ${linkErr ? "ring-2 ring-destructive/40 focus:ring-destructive/30" : "focus:ring-primary/20"}`} />
                      {linkErr && <p className="text-[11px] text-destructive mt-1">{linkErr}</p>}
                    </div>
                    <select value={adForm.placement} onChange={(e) => setAdForm(f => ({ ...f, placement: e.target.value as "top" | "middle" }))}
                      className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="top">Баннерийн доор (дээд)</option>
                      <option value="middle">Барааны жагсаалтын дунд</option>
                    </select>
                    <select value={adForm.aspect} onChange={(e) => setAdForm(f => ({ ...f, aspect: e.target.value }))}
                      className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="21:9">Хэмжээ: 21:9 — 1200×514 px (өргөн баннер)</option>
                      <option value="16:9">Хэмжээ: 16:9 — 1200×675 px</option>
                      <option value="4:1">Хэмжээ: 4:1 — 1200×300 px (нарийн)</option>
                      <option value="3:1">Хэмжээ: 3:1 — 1200×400 px</option>
                      <option value="2:1">Хэмжээ: 2:1 — 1200×600 px</option>
                      <option value="1:1">Хэмжээ: 1:1 — 1200×1200 px (квадрат)</option>
                    </select>
                    <select value={adForm.device} onChange={(e) => setAdForm(f => ({ ...f, device: e.target.value as any }))}
                      className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="all">Бүх төхөөрөмж</option>
                      <option value="mobile">📱 Зөвхөн мобайл (&lt; 768px)</option>
                      <option value="tablet">📋 Зөвхөн таблет (768–1023px)</option>
                      <option value="desktop">💻 Зөвхөн компьютер (≥ 1024px)</option>
                    </select>
                  </div>
                    );
                  })()}
                  {(() => {
                    const [rw, rh] = (adForm.aspect || "21:9").split(":").map(Number);
                    const outW = 1200;
                    const outH = Math.round((outW * rh) / rw);
                    const deviceLabel: Record<string, string> = {
                      all: "бүх төхөөрөмж",
                      mobile: "мобайл (< 768px)",
                      tablet: "таблет (768–1023px)",
                      desktop: "компьютер (≥ 1024px)",
                    };
                    return (
                      <div className="rounded-xl bg-secondary/50 border border-border px-4 py-3 text-[12px] text-muted-foreground space-y-1">
                        <p>
                          <span className="font-semibold text-foreground">📐 Санал болгох хэмжээ ({deviceLabel[adForm.device]}):</span>{" "}
                          <span className="font-semibold text-foreground">{outW}×{outH} px</span> · харьцаа {adForm.aspect}
                        </p>
                        <p>Файлын дээд хэмжээ: <span className="font-semibold">10MB</span>. Зургийн өргөн автоматаар хамгийн ихдээ <span className="font-semibold">1200px</span>-руу багасч WebP форматаар хадгалагдана.</p>
                        <p>Сонгосон харьцаагаар төв хэсгээс автоматаар тайрагдах тул зургийнхаа гол сэдвийг яг голд нь байрлуулна уу.</p>
                      </div>
                    );
                  })()}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">ADS зураг *</label>
                    <div className="flex items-center gap-3">
                      {adForm.image_url ? (
                        <img src={adForm.image_url} alt="ADS" className="h-20 w-36 rounded-xl object-cover border border-border" />
                      ) : (
                        <div className="h-20 w-36 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <button type="button" onClick={() => adImageFileRef.current?.click()}
                          className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 rounded-lg px-3 py-2 text-xs font-medium transition-colors">
                          <Upload className="h-3.5 w-3.5" /> Зураг оруулах
                        </button>
                        {adForm.image_url && (
                          <button type="button" onClick={() => setAdForm(f => ({ ...f, image_url: "" }))}
                            className="text-xs text-destructive hover:underline">Зураг устгах</button>
                        )}
                        <input ref={adImageFileRef} type="file" accept="image/*" className="hidden" onChange={handleAdImageUpload} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveAd}
                      className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                      {editAdId ? "Шинэчлэх" : "Нэмэх"}
                    </button>
                    {editAdId && (
                      <button onClick={() => { setAdForm({ image_url: "", link_url: "", placement: "top", aspect: "21:9", device: "all" }); setEditAdId(null); }}
                        className="bg-secondary rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors">
                        Болих
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {adImages.map((a) => (
                    <div key={a.id} className="bg-card rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-3">
                        <img src={a.image_url} alt="ADS" className="h-16 w-28 rounded-lg object-cover border border-border flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">
                            {a.placement === "top" ? "Баннерийн доор" : "Барааны дунд"}
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              {a.device === "mobile" ? "📱 Мобайл" : a.device === "tablet" ? "📋 Таблет" : a.device === "desktop" ? "💻 Компьютер" : "Бүх төхөөрөмж"}
                            </span>
                          </p>
                          {a.link_url && <p className="text-xs text-muted-foreground truncate">→ {a.link_url}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleAdActive(a.id, a.is_active)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${a.is_active ? "bg-green-500/10 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                            {a.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                          </button>
                          <button onClick={() => { setAdForm({ image_url: a.image_url, link_url: a.link_url || "", placement: a.placement, aspect: adForm.aspect || "21:9", device: (a.device as any) || "all" }); setEditAdId(a.id); }}
                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteAd(a.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {adImages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">ADS зураг байхгүй</p>
                  )}
                </div>
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
      <PrintChecklistModal
        open={showPrintChecklist}
        onOpenChange={setShowPrintChecklist}
        count={pendingPrintOrders.length}
        onConfirm={() => {
          setShowPrintChecklist(false);
          printOrders(pendingPrintOrders);
        }}
      />
    </div>
  );
};

export default AdminPage;
