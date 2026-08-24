import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import OrderStatusTimeline from "@/components/admin/OrderStatusTimeline";

import {
  ArrowLeft, Plus, Pencil, Trash2, Users, ShoppingBag, Package,
  BarChart3, LayoutDashboard, Search, X, AlertTriangle, AlertCircle, BadgeCheck, Image as ImageIcon, Eye, Upload, Loader2, ChevronDown, Tag, Layers, Video, Truck, CreditCard, Megaphone, Globe, Copy, Link2, MessageCircle, Settings, FileSpreadsheet, Sparkles,
  Calendar, MapPin, Phone, User, FileText, Wallet, Receipt, Store, Activity, RefreshCw, Star, Gift, Smartphone, Monitor, Tablet, PlayCircle, ExternalLink, Zap, RotateCcw, Ruler, Lock
} from "lucide-react";
import WebAnalytics from "@/components/admin/WebAnalytics";
import CollectionsManager from "@/components/admin/CollectionsManager";
import AnnouncementsManager from "@/components/admin/AnnouncementsManager";
import WelcomeShowcaseManager from "@/components/admin/WelcomeShowcaseManager";
import ChatbotSettingsManager from "@/components/admin/ChatbotSettingsManager";
import RecommendationSettingsManager from "@/components/admin/RecommendationSettingsManager";
import LoyaltySettingsManager from "@/components/admin/LoyaltySettingsManager";
import ReminderSettingsManager from "@/components/admin/ReminderSettingsManager";
import ReviewsManager from "@/components/admin/ReviewsManager";
import SpinSettingsManager from "@/components/admin/SpinSettingsManager";
import EasyRewardsManager from "@/components/admin/EasyRewardsManager";
import ReferralManager from "@/components/admin/ReferralManager";
import WalletCreditsManager from "@/components/admin/WalletCreditsManager";
import CouponUsageManager from "@/components/admin/CouponUsageManager";
import FlashSalesManager from "@/components/admin/FlashSalesManager";
import ReelsManager from "@/components/admin/ReelsManager";
import ReportDashboard from "@/components/admin/ReportDashboard";
import { BrandingSettingsManager } from "@/components/admin/BrandingSettingsManager";



import StockDeductionLog from "@/components/admin/StockDeductionLog";

import DriversManager from "@/components/admin/DriversManager";
import TrackingDashboard from "@/components/admin/TrackingDashboard";
import DeliveryPortal from "@/components/admin/DeliveryPortal";
import BranchesManager from "@/components/admin/BranchesManager";
import AdminSkeleton from "@/components/admin/AdminSkeleton";
import { ProductSizeManager } from "@/components/admin/ProductSizeManager";
import ReturnsManager from "@/components/admin/ReturnsManager";
import RecentlyDeletedOrders from "@/components/admin/RecentlyDeletedOrders";
import AddressSelector from "@/components/store/AddressSelector";


import { useRef } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/data/products";
import { optimizeImage, generateThumbnail, estimateBase64Size, cropAndOptimizeImage, uploadVideo } from "@/lib/imageOptimize";
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
import { PrintChecklistModal } from "@/components/admin/PrintChecklistModal";

type Tab = "stats" | "report" | "tracking" | "products" | "orders" | "users" | "drivers" | "categories" | "brands" | "delivery" | "delivery-portal" | "payments" | "banner" | "announcements" | "welcome-showcase" | "collections" | "chatbot" | "analytics" | "diagnostics" | "stocklog" | "recommendations" | "loyalty" | "reminders" | "reviews" | "spin" | "referral" | "promotions" | "coupon-usage" | "easyrewards" | "flash-sales" | "reels" | "settings" | "bonus" | "branches" | "returns" | "branding";

const SETTINGS_TABS: Tab[] = ["branding", "categories", "brands", "delivery", "payments", "banner", "announcements", "welcome-showcase", "collections", "analytics", "diagnostics", "stocklog", "recommendations", "reminders", "reviews", "flash-sales", "reels", "drivers", "branches", "returns"];
const BONUS_TABS: Tab[] = ["loyalty", "spin", "referral", "promotions", "coupon-usage", "easyrewards"];






type DeviceInfo = { device: string; user_agent: string | null; last_seen_at: string } | null;

const DeviceBadge = ({ info }: { info: DeviceInfo }) => {
  if (!info) return <span className="text-xs text-muted-foreground">—</span>;
  const ua = (info.user_agent || "").toLowerCase();
  const isTablet = /ipad|tablet/.test(ua) || info.device === "tablet";
  const isMobile = !isTablet && info.device === "mobile";
  const Icon = isTablet ? Tablet : isMobile ? Smartphone : Monitor;
  const label = isTablet ? "Таблет" : isMobile ? "Гар утас" : "Компьютер";
  const cls = isTablet
    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : isMobile
    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
    : "bg-blue-500/10 text-blue-600 border-blue-500/30";
  let osTag = "";
  if (/iphone|ipad|ios/.test(ua)) osTag = "iOS";
  else if (/android/.test(ua)) osTag = "Android";
  else if (/windows/.test(ua)) osTag = "Windows";
  else if (/mac os|macintosh/.test(ua)) osTag = "macOS";
  else if (/linux/.test(ua)) osTag = "Linux";
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border ${cls}`}
      title={info.user_agent || ""}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {osTag && <span className="opacity-70">· {osTag}</span>}
    </div>
  );
};

const AdminPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isManualOrderRoute = location.pathname === "/admin/manual-order";
  const isReportRoute = location.pathname === "/admin/report";
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isModerator, isSeller, loading: authLoading, rolesLoading, authError } = useAuth();
  const hasAdminAccess = isAdmin || isModerator || isSeller;
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    if (isReportRoute) return "report";
    const t = searchParams.get("tab") as Tab | null;
    const valid: Tab[] = ["stats", "report", "tracking", "products", "orders", "users", "drivers", "categories", "brands", "delivery", "delivery-portal", "payments", "banner", "announcements", "welcome-showcase", "collections", "chatbot", "analytics", "diagnostics", "stocklog", "recommendations", "loyalty", "reminders", "reviews", "spin", "referral", "promotions", "coupon-usage", "easyrewards", "flash-sales", "reels", "settings", "bonus", "branches", "returns", "branding"];
    return t && valid.includes(t) ? t : "stats";
  });

  const [activeProductForSize, setActiveProductForSize] = useState<any>(null);

  const handleEditProductSize = (p: any) => {
    setActiveProductForSize(p);
  };

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<any[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<any[]>([]);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [adImages, setAdImages] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string; phone: string | null; note: string | null; is_active: boolean }[]>([]);
  const [deliveryDraft, setDeliveryDraft] = useState<Record<string, { driverId: string; courierName: string }>>({});
  const [deliverDialog, setDeliverDialog] = useState<{ orderId: string; driverId: string; courierName: string; courierPhone: string; reassign?: boolean } | null>(null);
  const [bulkDeliverDialog, setBulkDeliverDialog] = useState<{ orderIds: string[]; driverId: string } | null>(null);
  const [bulkDispatchProgress, setBulkDispatchProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [partnerDrivers, setPartnerDrivers] = useState<{ driver_id: string; name: string; phone: string }[]>([]);
  const [partnerDriversLoading, setPartnerDriversLoading] = useState(false);
  const [partnerDriversFetchedAt, setPartnerDriversFetchedAt] = useState<number>(0);
  const [savingDeliverDialog, setSavingDeliverDialog] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);


  // Promo banner form state
  const [bannerForm, setBannerForm] = useState({ title: "", subtitle: "", button_text: "Бүтээгдхүүн үзэх", button_link: "/shop", banner_image: "" });
  const [editBannerId, setEditBannerId] = useState<string | null>(null);
  const bannerImageFileRef = useRef<HTMLInputElement>(null);
  const catImageFileRef = useRef<HTMLInputElement>(null);

  // ADS image form state
  const [adForm, setAdForm] = useState<{ image_url: string; link_url: string; placement: "top" | "middle"; aspect: string; device: "all" | "mobile" | "tablet" | "desktop" }>({ image_url: "", link_url: "", placement: "top", aspect: "21:9", device: "all" });
  const [editAdId, setEditAdId] = useState<string | null>(null);
  const adImageFileRef = useRef<HTMLInputElement>(null);


  // Category/Brand form state
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catParent, setCatParent] = useState<string>("none");
  const [catImage, setCatImage] = useState("");
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
  const [editingOrderInfo, setEditingOrderInfo] = useState<any | null>(null);
  const [savingOrderInfo, setSavingOrderInfo] = useState(false);
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
    detail_media: [] as { type: "image" | "video" | "text"; url: string; caption: string; thumbnail?: string }[],
    brand_id: "",
    colors: [] as { name: string; image: string; sku: string }[],
    sizes: [] as string[],
    stock_quantity: 0,
    variant_stock: {} as Record<string, number>,
    average_reorder_days: 0,
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
      const isAnimated = /\.(webp|gif)$/i.test(file.name) || file.type === "image/webp" || file.type === "image/gif";
      const maxSize = isAnimated ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) { toast.error(`${file.name}: ${isAnimated ? "20MB" : "5MB"}-ээс бага байх ёстой`); continue; }
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
      if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) continue;
      if (file.size > 50 * 1024 * 1024) { toast.error("Видео 50MB-ээс бага байх ёстой"); continue; }
      try {
        const videoUrl = await uploadVideo(file, "detail");
        newMedia.push({ type: "video", url: videoUrl, caption: "" });
      } catch {
        toast.error("Видео хадгалахад алдаа гарлаа");
      }
    }
    if (newMedia.length > 0) {
      setForm((prev) => ({ ...prev, detail_media: [...prev.detail_media, ...newMedia] }));
      toast.success(`${newMedia.length} бичлэг файл хэлбэрээр нэмэгдлээ`);
    }
    if (detailVideoFileRef.current) detailVideoFileRef.current.value = "";
  };


  const [extraImages, setExtraImages] = useState<string[]>([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [orderSearchPhone, setOrderSearchPhone] = useState("");
  const [ordersSubTab, setOrdersSubTab] = useState<"active" | "delivered" | "unpaid_delivery">("active");
  const [deliveredSourceTab, setDeliveredSourceTab] = useState<"all" | "web" | "manual">("all");
  const [showCancelledRecent, setShowCancelledRecent] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [productSelected, setProductSelected] = useState<Set<string>>(new Set());
  const [bulkDiscountPct, setBulkDiscountPct] = useState<number>(0);
  const [bulkDiscountAmt, setBulkDiscountAmt] = useState<number>(0);
  const [bulkDiscountMode, setBulkDiscountMode] = useState<"pct" | "amt">("pct");
  const [bulkDiscountLoading, setBulkDiscountLoading] = useState(false);
  
  const [showPrintChecklist, setShowPrintChecklist] = useState(false);
  const [checklistTarget, setChecklistTarget] = useState<any[]>([]);
  
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
    payment_method: "bank_personal",
    payment_status: "confirmed" as "unpaid" | "confirmed",
    status: "confirmed" as "pending" | "confirmed" | "preparing" | "delivering" | "completed" | "cancelled",
    note: "",
    sale_date: (() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); })(),
    external_ref: "",
    branch: "Лавай",
  });
  const [manualItems, setManualItems] = useState<{ product_id: string | null; name: string; price: number; quantity: number; product_code?: string; image?: string; color?: string; size?: string; sku?: string; variant_stock?: number; }[]>([]);
  const [manualProductSearch, setManualProductSearch] = useState("");
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  // Auto-open manual order modal when on dedicated /admin/manual-order route
  const manualRouteOpenedRef = useRef(false);
  useEffect(() => {
    if (isManualOrderRoute && hasAdminAccess && !manualRouteOpenedRef.current) {
      manualRouteOpenedRef.current = true;
      setShowManualOrder(true);
    }
  }, [isManualOrderRoute, hasAdminAccess]);

  // When user closes modal on the dedicated route, navigate back to admin orders
  useEffect(() => {
    if (isManualOrderRoute && manualRouteOpenedRef.current && !showManualOrder && !manualSubmitting) {
      const t = setTimeout(() => navigate("/admin?tab=orders"), 50);
      return () => clearTimeout(t);
    }
  }, [showManualOrder, isManualOrderRoute, manualSubmitting, navigate]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraFileInputRef = useRef<HTMLInputElement>(null);
  const extraVideoInputRef = useRef<HTMLInputElement>(null);
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

  const handleExtraVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newVideos: string[] = [];
    let hasError = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) { hasError = true; continue; }
      if (file.size > 50 * 1024 * 1024) { toast.error("Бичлэг 50MB-ээс бага байх ёстой"); hasError = true; continue; }
      try {
        const videoUrl = await uploadVideo(file, "gallery");
        newVideos.push(videoUrl);
      } catch {
        hasError = true;
      }
    }
    if (hasError) toast.error("Зарим бичлэг оруулж чадсангүй");
    if (newVideos.length > 0) {
      setExtraImages((prev) => [...prev, ...newVideos]);
      toast.success(`${newVideos.length} бичлэг файл хэлбэрээр нэмэгдлээ`);
    }
    if (extraVideoInputRef.current) extraVideoInputRef.current.value = "";
  };

  useEffect(() => {
    if (!authLoading && !rolesLoading && !hasAdminAccess && !authError) {
      toast.error("Админ эрхгүй байна");
      navigate("/");
    }
  }, [isAdmin, isModerator, isSeller, authLoading, rolesLoading, authError]);

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
    fetchDrivers();
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
      fetchDrivers(),
    ]);

    setRefreshing(false);
    toast.success("Мэдээлэл шинэчлэгдлээ");
  };

  useEffect(() => {
    if (authLoading || rolesLoading || !hasAdminAccess) return;
    loadAdminData();
  }, [authLoading, rolesLoading, isAdmin, isModerator, isSeller]);

  // Realtime sync: reflect delivery/payment/status updates from the partner
  // portal & webhooks without needing a manual refresh.
  useEffect(() => {
    if (authLoading || !hasAdminAccess) return;
    const channel = supabase
      .channel("admin-orders-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload: any) => {
          const row = payload?.new;
          if (!row?.id) return;
          setOrders((prev: any[]) => prev.map((o) => o.id === row.id ? { ...o, ...row, items: o.items } : o));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => { fetchOrders(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authLoading, hasAdminAccess]);

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
      // Use lightweight RPC that strips heavy base64 images from items jsonb.
      // PostgREST caps rows at 1000 per request, so page through with .range().
      const PAGE = 1000;
      let from = 0;
      const all: any[] = [];
      // Safety cap: 50k orders
      for (let i = 0; i < 50; i++) {
        const { data, error } = await (supabase as any)
          .rpc("admin_list_orders_light")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = data || [];
        all.push(...rows);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      setOrders(all);
    } catch (error) {
      console.error("Failed to load admin orders", error);
      // Fallback to direct paginated query
      const PAGE = 1000;
      let from = 0;
      const all: any[] = [];
      for (let i = 0; i < 50; i++) {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        const rows = data || [];
        all.push(...rows);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      setOrders(all);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers" as any)
        .select("id, full_name, phone, note, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDrivers((data as any) || []);
    } catch (e) {
      console.error("Failed to load drivers", e);
    }
  };

  const markOrderDelivered = async (orderId: string) => {
    const draft = deliveryDraft[orderId] || { driverId: "", courierName: "" };
    const driver = drivers.find((d) => d.id === draft.driverId);
    const courierName = draft.courierName.trim() || driver?.full_name || "";
    if (!driver && !courierName) {
      toast.error("Жолооч сонгох эсвэл нэр оруулна уу");
      return;
    }
    setSavingDelivery(orderId);
    const nowIso = new Date().toISOString();
    const patch: Record<string, any> = {
      delivery_status: "delivered",
      delivered_at: nowIso,
      delivery_signature_name: courierName,
      updated_at: nowIso,
    };
    if (driver) patch.driver_id = driver.id;
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    setSavingDelivery(null);
    if (error) {
      toast.error("Хадгалахад алдаа: " + error.message);
      return;
    }
    toast.success("Хүргэлт бүртгэгдлээ");
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
    setDeliveryDraft((prev) => { const c = { ...prev }; delete c[orderId]; return c; });
  };

  const mapOrderStatusToDeliveryFulfillment = (status: string) => {
    const map: Record<string, string> = {
      pending: "confirmed",
      confirmed: "confirmed",
      preparing: "preparing",
      delivering: "out_for_delivery",
      completed: "delivered",
      cancelled: "cancelled",
    };
    return map[status] || status;
  };

  const notifyDeliveryFulfillment = async (orderId: string, status: string, note?: string) => {
    const { data, error } = await supabase.functions.invoke("notify-delivery-status", {
      body: {
        order_id: orderId,
        fulfillment_status: mapOrderStatusToDeliveryFulfillment(status),
        event_id: `easyshop-status-${orderId}-${Date.now()}`,
        note,
      },
    });
    if (error || data?.success === false) {
      console.error("Delivery fulfillment sync failed:", error || data);
    }
  };

  const getOrderReactivationPatch = (newStatus: string, currentOrder?: any) => {
    const wasTerminal = currentOrder?.status === "cancelled"
      || currentOrder?.status === "completed"
      || currentOrder?.delivery_status === "cancelled"
      || currentOrder?.delivery_status === "delivered"
      || !!currentOrder?.delivered_at;

    if (!wasTerminal || newStatus === "cancelled" || newStatus === "completed") return {};

    return {
      delivered_at: null,
      delivery_failed_at: null,
      delivery_return_reason: null,
      delivery_status: newStatus === "delivering"
        ? "out_for_delivery"
        : currentOrder?.delivery_order_id
          ? "confirmed"
          : null,
    };
  };


  const loadPartnerDrivers = async (force = false) => {
    const CACHE_MS = 5 * 60 * 1000;
    if (!force && partnerDrivers.length > 0 && Date.now() - partnerDriversFetchedAt < CACHE_MS) return;
    setPartnerDriversLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-drivers", { body: {} });
      if (error) throw error;
      const list = Array.isArray((data as any)?.drivers) ? (data as any).drivers : [];
      setPartnerDrivers(list);
      setPartnerDriversFetchedAt(Date.now());
    } catch (e: any) {
      toast.error("Жолоочдын жагсаалт татаж чадсангүй: " + (e?.message || e));
    } finally {
      setPartnerDriversLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (newStatus === "delivering") {
      loadPartnerDrivers();
      setDeliverDialog({
        orderId,
        driverId: order?.driver_id || "",
        courierName: order?.delivery_signature_name || "",
        courierPhone: "",
      });
      return;
    }
    const patch = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...getOrderReactivationPatch(newStatus, order),
    };
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) {
      console.error("Order status update error:", error);
      toast.error("Төлөв өөрчлөхөд алдаа гарлаа: " + error.message);
    } else {
      toast.success(`Захиалгын төлөв "${statusLabels[newStatus]}" болж өөрчлөгдлөө`);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...patch } : o));

      // Keep API-connected delivery systems in sync, including terminal-state reactivation.
      await notifyDeliveryFulfillment(
        orderId,
        newStatus,
        newStatus === "cancelled"
          ? "Easyshop дээр цуцлагдсан"
          : "Easyshop дээр төлөв гараар шинэчлэгдсэн"
      );
      // Notify delivery system when payment confirmed
      if (newStatus === "confirmed") {
        if (order?.delivery_order_id) {
          supabase.functions.invoke("notify-delivery-status", {
            body: { order_id: orderId, payment_status: "paid" },
          }).catch(console.error);
        }
      }
    }
  };

  const confirmDeliverDispatch = async () => {
    if (!deliverDialog) return;
    const { orderId, driverId, reassign } = deliverDialog;
    const partnerDriver = partnerDrivers.find((d) => d.driver_id === driverId);
    if (!partnerDriver) {
      toast.error("Жолооч сонгоно уу");
      return;
    }
    setSavingDeliverDialog(true);
    const nowIso = new Date().toISOString();
    const signature = partnerDriver.name + (partnerDriver.phone ? ` · ${partnerDriver.phone}` : "");
    const patch: Record<string, any> = {
      status: "delivering",
      delivery_status: "out_for_delivery",
      delivered_at: null,
      delivery_failed_at: null,
      delivery_return_reason: null,
      delivery_signature_name: signature,
      updated_at: nowIso,
    };
    if (!reassign) patch.picked_up_at = nowIso;
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) {
      setSavingDeliverDialog(false);
      toast.error("Хадгалахад алдаа: " + error.message);
      return;
    }
    // Send to Swift Delivery Hub with driver assignment
    const { data: notifyData, error: notifyErr } = await supabase.functions.invoke("notify-delivery-status", {
      body: {
        order_id: orderId,
        fulfillment_status: "out_for_delivery",
        driver_id: partnerDriver.driver_id,
        driver_phone: partnerDriver.phone,
        event_id: `easyshop-${reassign ? "reassign" : "dispatch"}-${orderId}-${Date.now()}`,
        note: `${reassign ? "Жолооч солигдлоо" : "Жолооч оноогдлоо"}: ${signature}`,
      },
    });
    setSavingDeliverDialog(false);
    if (notifyErr || (notifyData as any)?.success === false) {
      console.error("Swift Hub notify failed:", notifyErr || notifyData);
      toast.error("Хүргэлтийн систем рүү илгээхэд алдаа гарлаа");
    } else {
      toast.success(`${reassign ? "Жолооч солигдлоо" : "Хүргэлтэнд гарлаа"} · ${partnerDriver.name}`);
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
    setDeliverDialog(null);
  };

  const settleOrder = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    
    setSettlingOrderId(orderId);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("orders")
        .update({ 
          is_settled: true,
          settled_at: now,
          updated_at: now
        })
        .eq("id", orderId);
        
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_settled: true, settled_at: now } : o));
      toast.success("Борлуулалт хаагдлаа (Дараагийн өдрийн тайланд тооцогдохгүй)");
    } catch (e: any) {
      console.error(e);
      toast.error("Алдаа гарлаа: " + e.message);
    } finally {
      setSettlingOrderId(null);
    }
  };

  const handlePrintRequest = (orders: any[]) => {
    setChecklistTarget(orders);
    setShowPrintChecklist(true);
  };

  const confirmBulkDeliverDispatch = async () => {
    if (!bulkDeliverDialog) return;
    const { orderIds, driverId } = bulkDeliverDialog;
    const partnerDriver = partnerDrivers.find((d) => d.driver_id === driverId);
    if (!partnerDriver) { toast.error("Жолооч сонгоно уу"); return; }
    if (orderIds.length === 0) { toast.error("Захиалга сонгоно уу"); return; }
    const signature = partnerDriver.name + (partnerDriver.phone ? ` · ${partnerDriver.phone}` : "");
    setBulkDispatchProgress({ done: 0, total: orderIds.length, failed: 0 });
    const tId = toast.loading(`0 / ${orderIds.length} захиалга илгээж байна…`);
    let done = 0, failed = 0;
    const nowIso = () => new Date().toISOString();
    const patchBase = {
      status: "delivering",
      delivery_status: "out_for_delivery",
      delivered_at: null,
      delivery_failed_at: null,
      delivery_return_reason: null,
      delivery_signature_name: signature,
    };
    for (const orderId of orderIds) {
      try {
        const now = nowIso();
        const { error } = await supabase.from("orders").update({ ...patchBase, picked_up_at: now, updated_at: now }).eq("id", orderId);
        if (error) throw error;
        const { error: notifyErr } = await supabase.functions.invoke("notify-delivery-status", {
          body: {
            order_id: orderId,
            fulfillment_status: "out_for_delivery",
            driver_id: partnerDriver.driver_id,
            driver_phone: partnerDriver.phone,
            event_id: `easyshop-bulk-${orderId}-${Date.now()}`,
            note: `Багц хүргэлт: ${signature}`,
          },
        });
        if (notifyErr) throw notifyErr;
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patchBase, picked_up_at: now } : o)));
        done++;
      } catch (e) {
        console.error("bulk dispatch failed for", orderId, e);
        failed++;
      }
      setBulkDispatchProgress({ done: done + failed, total: orderIds.length, failed });
      toast.loading(`${done + failed} / ${orderIds.length} захиалга${failed > 0 ? ` · ${failed} алдаа` : ""}`, { id: tId });
    }
    toast.success(`Багц дуусав · ${done} амжилттай${failed > 0 ? ` · ${failed} алдаа` : ""} · ${partnerDriver.name}`, { id: tId });
    setBulkDispatchProgress(null);
    setBulkDeliverDialog(null);
    setBulkSelected(new Set());
  };





  const [sendingDelivery, setSendingDelivery] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [openingPortal, setOpeningPortal] = useState<string | null>(null);

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

  const openOrderInPortal = async (order: any) => {
    setOpeningPortal(order.id);
    try {
      const { data, error } = await supabase.functions.invoke("partner-portal-session", {
        body: {
          external_order_id: `EASY-${order.order_ref || order.id}`,
          delivery_order_id: order.delivery_order_id || undefined,
          order_ref: order.order_ref || undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok || !data?.portal_url) throw new Error(data?.error || "Порталын линк ирсэнгүй");
      window.open(data.portal_url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error("Порталыг нээхэд алдаа: " + (e?.message || e));
    } finally {
      setOpeningPortal(null);
    }
  };

  const unsentOrders = useMemo(
    () => orders.filter((o: any) =>
      !o.delivery_order_id
      && o.status !== "cancelled"
      && (o.status === "confirmed" || o.status === "delivering" || o.payment_status === "confirmed" || o.payment_status === "paid" || o.payment_status === "paid")
    ),
    [orders]
  );

  const deliveryStatusCounts = useMemo(() => {
    const c = { processing: 0, confirmed: 0, out_for_delivery: 0, delivered: 0, cancelled: 0 } as Record<string, number>;
    for (const o of orders as any[]) {
      if (!o.delivery_order_id) continue;
      const s = o.delivery_status || "processing";
      if (c[s] === undefined) c[s] = 0;
      c[s] += 1;
    }
    return c;
  }, [orders]);

  const bulkResendUnsent = async () => {
    if (unsentOrders.length === 0) return;
    if (!window.confirm(`${unsentOrders.length} захиалгыг хүргэлтэнд илгээх үү?`)) return;
    setBulkSending(true);
    let ok = 0, fail = 0;
    for (const o of unsentOrders) {
      try {
        const { data, error } = await supabase.functions.invoke("send-to-delivery", { body: { order_id: o.id } });
        if (error || !data?.success) { fail += 1; continue; }
        ok += 1;
        setOrders((prev) => prev.map((x: any) => x.id === o.id ? { ...x, delivery_order_id: data.delivery_order_id, delivery_status: "processing" } : x));
      } catch { fail += 1; }
    }
    setBulkSending(false);
    toast.success(`Илгээгдсэн: ${ok}${fail ? ` · Алдаа: ${fail}` : ""}`);
  };

  const [deleteOrderTarget, setDeleteOrderTarget] = useState<{ id: string } | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [deletedRefreshKey, setDeletedRefreshKey] = useState(0);

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingOrder(true);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      toast.error("Захиалга устгахад алдаа гарлаа: " + error.message);
    } else {
      toast.success("Захиалга устгагдлаа");
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setDeletedRefreshKey((k) => k + 1);
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
    setManualProductSearch("");
  };

  // "Бараа солих" (exchange): force all item prices to 0 automatically.
  useEffect(() => {
    if (manualForm.payment_method !== "exchange") return;
    setManualItems((prev) => {
      if (!prev.some((it) => (Number(it.price) || 0) !== 0)) return prev;
      return prev.map((it) => ({ ...it, price: 0 }));
    });
  }, [manualForm.payment_method, manualItems.length]);

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
        payment_status: manualForm.payment_method === "exchange" ? "confirmed" : manualForm.payment_status,
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
      // Гараар оруулсан захиалга нь аль хэдийн баталгаажсан гэж үзэн шууд
      // хүргэлтийн систем рүү автоматаар илгээнэ.
      (async () => {
        try {
          const { data: sendRes, error: sendErr } = await supabase.functions.invoke(
            "send-to-delivery",
            { body: { order_id: data.id } }
          );
          if (sendErr || !sendRes?.success) {
            console.error("auto send-to-delivery failed", sendErr, sendRes);
            toast.error("Хүргэлт рүү автоматаар илгээж чадсангүй. Гараар илгээнэ үү.");
            return;
          }
          toast.success("Хүргэлт рүү автоматаар илгээгдлээ");
          if (sendRes.delivery_order_id) {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === data.id
                  ? { ...o, delivery_order_id: sendRes.delivery_order_id, delivery_status: "processing" }
                  : o
              )
            );
          }
        } catch (err) {
          console.error("auto send-to-delivery exception", err);
          toast.error("Хүргэлт рүү илгээхэд алдаа гарлаа");
        }
      })();
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
    organization: { label: "Байгууллага", color: "bg-indigo-500/10 text-indigo-600" },
    sono: { label: "Соно", color: "bg-rose-500/10 text-rose-600" },
    transfer: { label: "Шилжүүлэг", color: "bg-cyan-500/10 text-cyan-600" },
    pocket: { label: "Pocket", color: "bg-green-500/10 text-green-600" },
    exchange: { label: "Бараа солих", color: "bg-slate-500/10 text-slate-600" },
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
    preparing: "Бэлдэж байна",
    delivering: "Хүргэлтэнд гарсан",
    completed: "Дууссан",
    cancelled: "Цуцлагдсан",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    confirmed: "bg-emerald-500/10 text-emerald-600",
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

      // Attach latest device info per user from analytics_sessions
      const deviceMap: Record<string, { device: string; user_agent: string | null; last_seen_at: string }> = {};
      try {
        const { data: sessData } = await supabase
          .from("analytics_sessions")
          .select("user_id, device, user_agent, last_seen_at")
          .not("user_id", "is", null)
          .order("last_seen_at", { ascending: false })
          .limit(2000);
        (sessData || []).forEach((s: any) => {
          if (!s.user_id) return;
          if (!deviceMap[s.user_id]) {
            deviceMap[s.user_id] = { device: s.device, user_agent: s.user_agent, last_seen_at: s.last_seen_at };
          }
        });
      } catch (e) {
        console.warn("Failed to load device sessions", e);
      }

      const enriched = baseUsers.map((u: any) => ({
        ...u,
        roles: rolesMap[u.user_id] || [],
        device_info: deviceMap[u.user_id] || null,
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
    setForm({ name: "", description: "", price: 0, original_price: 0, image_url: "", category: "general", discount: 0, is_new: false, is_on_sale: false, is_bogo: false, has_gift: false, gift_name: "", gifts: [], gift_packages: [], is_active: true, product_code: "", slug: "", specifications: [], detail_media: [], brand_id: "", colors: [], sizes: [], stock_quantity: 0, variant_stock: {}, average_reorder_days: 0 });
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
      detail_media: form.detail_media.filter(m => m.type === "text" ? (m.caption || "").trim() : m.url.trim()),
      brand_id: form.brand_id || null,
      colors: form.colors.filter(c => c.name.trim()),
      sizes: form.sizes.filter(s => s.trim()),
      average_reorder_days: Number(form.average_reorder_days) > 0 ? Number(form.average_reorder_days) : null,
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
      average_reorder_days: typeof p.average_reorder_days === "number" ? p.average_reorder_days : 0,
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
      average_reorder_days: typeof p.average_reorder_days === "number" ? p.average_reorder_days : 0,
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

  const moderatorTabs: Tab[] = ["stats", "report", "orders", "delivery", "drivers", "diagnostics", "reminders", "returns"];
  const sellerTabs: Tab[] = ["orders", "report"];


  // Moderator/Seller only see orders — auto-switch if they land on a non-allowed tab
  useEffect(() => {
    if (!isAdmin && isModerator && !moderatorTabs.includes(tab)) {
      setTab("orders");
    }
    if (!isAdmin && !isModerator && isSeller && !sellerTabs.includes(tab)) {
      setTab("orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isModerator, isSeller]);

  const allSidebarItems: { id: Tab; label: string; icon: any }[] = [
    { id: "stats", label: "Статистик", icon: BarChart3 },
    { id: "report", label: "Тайлан", icon: LayoutDashboard },
    { id: "tracking", label: "Хяналт", icon: Activity },
    { id: "products", label: "Бараа", icon: Package },
    { id: "orders", label: "Захиалга", icon: ShoppingBag },
    // { id: "delivery-portal", ... } — removed: use per-order block instead
    { id: "users", label: "Хэрэглэгч", icon: Users },
    { id: "chatbot", label: "AI Чатбот", icon: MessageCircle },
    { id: "bonus", label: "Бонус", icon: Gift },
    { id: "settings", label: "Ерөнхий тохиргоо", icon: Settings },
  ];


  const settingsSubItems: { id: Tab; label: string; icon: any }[] = [
    { id: "branding", label: "Branding & SEO", icon: Globe },
    { id: "categories", label: "Ангилал", icon: Layers },
    { id: "brands", label: "Брэнд", icon: Tag },
    { id: "delivery", label: "Хүргэлт", icon: Truck },
    { id: "payments", label: "Төлбөр", icon: CreditCard },
    { id: "banner", label: "Баннер", icon: Megaphone },
    { id: "announcements", label: "Popup мэдэгдэл", icon: Megaphone },
    { id: "welcome-showcase", label: "Тавтай морил цонх", icon: Sparkles },
    { id: "collections", label: "Багц линк", icon: Link2 },
    { id: "analytics", label: "Хандалт", icon: Globe },
    { id: "diagnostics", label: "Оношлогоо", icon: AlertTriangle },
    { id: "stocklog", label: "Нөөцийн хасалт", icon: Package },
    { id: "recommendations", label: "Зөвлөмжийн жинлүүр", icon: Sparkles },
    { id: "reminders", label: "Санамжийн SMS", icon: MessageCircle },
    { id: "reviews", label: "Сэтгэгдэл", icon: Star },
    { id: "flash-sales", label: "Flash Sale", icon: Sparkles },
    { id: "reels", label: "Reels удирдах", icon: PlayCircle },
    { id: "drivers", label: "Жолоочид", icon: Truck },
    { id: "branches", label: "Салбар & шивэгч", icon: Store },
    { id: "returns", label: "Бараа буцаалт", icon: RotateCcw },
  ];

  const bonusSubItems: { id: Tab; label: string; icon: any }[] = [
    { id: "loyalty", label: "Лоялти оноо", icon: Sparkles },
    { id: "spin", label: "Хүрд тоглоом", icon: Sparkles },
    { id: "referral", label: "Referral", icon: Users },
    { id: "promotions", label: "Урамшуулал", icon: Gift },
    { id: "coupon-usage", label: "Купон/Хожил", icon: Gift },
    { id: "easyrewards", label: "EasyRewards", icon: Gift },
  ];


  const sidebarItems = isAdmin
    ? allSidebarItems
    : isModerator
      ? allSidebarItems.filter(item => moderatorTabs.includes(item.id))
      : allSidebarItems.filter(item => sellerTabs.includes(item.id));

  const netTotal = (o: any) => (Number(o.total) || 0) - (Number(o.delivery_fee) || 0);
  const deliveryFeeOf = (o: any) => Number(o.delivery_fee) || 0;
  const grandTotal = (o: any) => (Number(o.total) || 0);

  const paidOrders = orders.filter((o: any) => o.status === 'confirmed' || o.status === 'completed');
  const productRevenue = paidOrders.reduce((s: number, o: any) => s + netTotal(o), 0);
  const totalDeliveryRevenue = paidOrders.reduce((s: number, o: any) => s + deliveryFeeOf(o), 0);
  const totalRevenue = productRevenue + totalDeliveryRevenue;

  // Орлогын дэлгэрэнгүй задаргаа
  const SOURCE_LABELS: Record<string, string> = {
    web: "🌐 Вэбээр",
    facebook: "📘 Facebook",
    phone: "📞 Утсаар",
    instagram: "📷 Instagram",
    store: "🏬 Дэлгүүр",
    other: "Бусад",
  };
  const PAYMENT_LABELS: Record<string, string> = {
    qpay: "QPay",
    storepay: "Storepay",
    pocket: "Pocket",
    sono: "Sono",
    omniway: "OmniWay",
    cash: "Бэлнээр",
    bank_personal: "Дансаар",
    exchange: "Солилцоо",
  };

  const revenueBreakdown = useMemo(() => {
    const isWeb = (o: any) => !o.source || o.source === "web";
    const sum = (list: any[], fn: (o: any) => number) => list.reduce((s, o) => s + fn(o), 0);

    const webOrders = paidOrders.filter(isWeb);
    const manualOrders = paidOrders.filter((o: any) => !isWeb(o));

    const group = (keyFn: (o: any) => string, labels: Record<string, string>) => {
      const map = new Map<string, { count: number; product: number; delivery: number }>();
      for (const o of paidOrders) {
        const k = keyFn(o) || "other";
        const cur = map.get(k) || { count: 0, product: 0, delivery: 0 };
        cur.count += 1;
        cur.product += netTotal(o);
        cur.delivery += deliveryFeeOf(o);
        map.set(k, cur);
      }
      return Array.from(map.entries())
        .map(([k, v]) => ({ key: k, label: labels[k] || k, ...v, total: v.product + v.delivery }))
        .sort((a, b) => b.total - a.total);
    };

    const channel = [
      { key: "web", label: "🌐 Вэбээр", count: webOrders.length, product: sum(webOrders, netTotal), delivery: sum(webOrders, deliveryFeeOf) },
      { key: "manual", label: "✍️ Гараар", count: manualOrders.length, product: sum(manualOrders, netTotal), delivery: sum(manualOrders, deliveryFeeOf) },
    ].map((c) => ({ ...c, total: c.product + c.delivery }));

    const paidDeliveryOrders = paidOrders.filter((o: any) => deliveryFeeOf(o) > 0);

    return {
      channel,
      bySource: group((o) => o.source || "web", SOURCE_LABELS),
      byPayment: group((o) => o.payment_method || "other", PAYMENT_LABELS),
      byStatus: group((o) => o.status, { confirmed: "Баталгаажсан", completed: "Дууссан" }),
      deliveryPaidCount: paidDeliveryOrders.length,
      deliveryFreeCount: paidOrders.length - paidDeliveryOrders.length,
      orderCount: paidOrders.length,
      avgOrder: paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0,
    };
  }, [orders]);


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

      {/* Edit Order Info Modal */}
      {editingOrderInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4"
          onClick={() => !savingOrderInfo && setEditingOrderInfo(null)}
        >
          <div
            className="bg-card w-full md:max-w-lg md:rounded-2xl rounded-t-2xl border border-border max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Захиалга засах</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {editingOrderInfo.order_ref || editingOrderInfo.id?.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => !savingOrderInfo && setEditingOrderInfo(null)}
                className="p-2 -mr-2 rounded-lg hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Хэрэглэгчийн нэр</label>
                <input
                  type="text"
                  value={editingOrderInfo.guest_name}
                  onChange={(e) => setEditingOrderInfo({ ...editingOrderInfo, guest_name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Овог нэр"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Утасны дугаар</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={editingOrderInfo.phone}
                  onChange={(e) => setEditingOrderInfo({ ...editingOrderInfo, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="99001122"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Хүргэлтийн хаяг</label>
                <textarea
                  value={editingOrderInfo.shipping_address}
                  onChange={(e) => setEditingOrderInfo({ ...editingOrderInfo, shipping_address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Дүүрэг, хороо, байр, орц, тоот"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Захиалгын эх сурвалж</label>
                <select
                  value={editingOrderInfo.source}
                  onChange={(e) => setEditingOrderInfo({ ...editingOrderInfo, source: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="web">🌐 Вэб сайт</option>
                  <option value="facebook">📘 Facebook</option>
                  <option value="instagram">📷 Instagram</option>
                  <option value="phone">📞 Утас</option>
                  <option value="store">🏬 Дэлгүүр</option>
                  <option value="other">Бусад</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Тэмдэглэл</label>
                <textarea
                  value={editingOrderInfo.source_note}
                  onChange={(e) => setEditingOrderInfo({ ...editingOrderInfo, source_note: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Заавал биш"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center gap-2 bg-card">
              <button
                onClick={() => !savingOrderInfo && setEditingOrderInfo(null)}
                disabled={savingOrderInfo}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              >
                Болих
              </button>
              <button
                onClick={async () => {
                  if (!editingOrderInfo) return;
                  setSavingOrderInfo(true);
                  const updates = {
                    guest_name: editingOrderInfo.guest_name?.trim() || null,
                    phone: editingOrderInfo.phone?.trim() || null,
                    shipping_address: editingOrderInfo.shipping_address?.trim() || null,
                    source: editingOrderInfo.source || "web",
                    source_note: editingOrderInfo.source_note?.trim() || null,
                  };
                  const { error } = await supabase.from("orders").update(updates).eq("id", editingOrderInfo.id);
                  setSavingOrderInfo(false);
                  if (error) {
                    toast.error(error.message || "Хадгалахад алдаа гарлаа");
                    return;
                  }
                  setOrders((prev) => prev.map((o) => (o.id === editingOrderInfo.id ? { ...o, ...updates } : o)));
                  toast.success("Захиалгын мэдээлэл хадгалагдлаа");
                  setEditingOrderInfo(null);
                }}
                disabled={savingOrderInfo}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingOrderInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual External Order Modal */}
      {showManualOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4 md:overflow-y-auto" onClick={() => !manualSubmitting && setShowManualOrder(false)}>
          <div className="bg-card w-full h-full md:h-auto md:rounded-2xl md:border md:border-border md:max-w-3xl md:my-8 md:max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-card border-b border-border px-4 md:px-5 py-3 md:py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold truncate">Захиалга оруулах</h2>
                <p className="hidden md:block text-xs text-muted-foreground mt-0.5">Гадны сувгаар (Facebook, утас, дэлгүүр) ирсэн захиалгыг гараар бүртгэнэ</p>
              </div>
              <button onClick={() => !manualSubmitting && setShowManualOrder(false)} className="p-2 -mr-2 rounded-lg hover:bg-secondary shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3 md:space-y-4 bg-muted/30 pb-24 md:pb-5">


              {/* SECTION 1 — Sale meta */}
              <section className="bg-card rounded-2xl border border-border overflow-hidden">
                <header className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 border-b border-border">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Үндсэн мэдээлэл</h3>
                </header>
                <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Борлуулсан огноо, цаг *</label>
                    <input
                      type="datetime-local"
                      value={manualForm.sale_date}
                      max={(() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); })()}
                      onChange={(e) => setManualForm((f) => ({ ...f, sale_date: e.target.value }))}
                      className="w-full rounded-xl bg-secondary px-3 py-3 md:py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="hidden md:block text-[10px] text-muted-foreground mt-1">Захиалга үүссэн он/сар/өдөр, цаг минутыг бүртгэнэ</p>
                  </div>
                  <div className="hidden md:block">
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
                    <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
                      <Store className="h-3.5 w-3.5" /> Бараа гарах байршил *
                    </label>
                    <select
                      value={manualForm.branch}
                      onChange={(e) => setManualForm((f) => ({ ...f, branch: e.target.value }))}
                      className="w-full rounded-xl bg-secondary px-3 py-3 md:py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Лавай">Лавай</option>
                      <option value="Онлайн">Онлайн</option>
                      <option value="Их наяд">Их наяд</option>
                      <option value="АБТЕМА">АБТЕМА</option>
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
                <div className="p-3 md:p-4 space-y-3">
                  {/* Mobile-only: paste blob to auto-fill phone + address */}
                  <div className="md:hidden">
                    <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Хурдан бөглөх — хуулж тавих
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Жишээ: ХУД 11-р хороо нархан хотхон 1 байр 34 орц 8 тоот код 1234, 99119911"
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw.trim()) return;
                        // 1) Extract up to 2 unique 8-digit Mongolian phone numbers
                        const phones = Array.from(
                          new Set(
                            (raw.match(/(?:\+?976[\s-]?)?[6789](?:[\s-]?\d){7}/g) || [])
                              .map((s) => s.replace(/\D/g, "").slice(-8))
                              .filter((s) => s.length === 8)
                          )
                        ).slice(0, 2);
                        // 2) Use raw text (minus phones) as the address — user can edit freely
                        const addressText = raw
                          .replace(/(?:\+?976[\s-]?)?[6789](?:[\s-]?\d){7}/g, " ")
                          .replace(/[,;|]+/g, " ")
                          .replace(/\s+/g, " ")
                          .trim();
                        setManualForm((f) => ({
                          ...f,
                          phone: phones.join(", ") || f.phone,
                          addr_landmark: addressText || f.addr_landmark,
                        }));
                        if (phones.length || addressText) {
                          toast.success(`Автоматаар бөглөгдлөө${phones.length ? ` · ${phones.length} утас` : ""}`);
                        }
                        e.target.value = "";
                      }}
                      className="w-full rounded-xl bg-primary/5 border border-primary/20 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/70"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Утас, дүүрэг, хороо, хаягтай текстээ энд хуулбал автоматаар доорх талбарууд бөглөгдөнө.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> Утас *
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={manualForm.phone}
                      onChange={(e) => setManualForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="9911XXXX"
                      className="w-full rounded-xl bg-secondary px-4 py-3 text-base font-medium tracking-wide focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Хүргэлтийн хаяг *
                    </label>
                    <textarea
                      rows={3}
                      value={manualForm.addr_landmark}
                      onChange={(e) => setManualForm((f) => ({ ...f, addr_landmark: e.target.value.slice(0, 500) }))}
                      placeholder="Дүүрэг, хороо, хотхон, байр, орц, тоот, орцны код гэх мэт дэлгэрэнгүй хаягаа бичнэ үү"
                      className="w-full rounded-xl bg-secondary px-3 py-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <label className="flex items-center gap-3 w-full rounded-xl bg-secondary/60 px-3 py-3 md:py-2.5 text-sm cursor-pointer hover:bg-secondary transition-colors">
                    <input
                      type="checkbox"
                      checked={Number(manualForm.delivery_fee) > 0}
                      onChange={(e) => setManualForm((f) => ({ ...f, delivery_fee: e.target.checked ? 8000 : 0 }))}
                      className="h-5 w-5 md:h-4 md:w-4 rounded"
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
                        className="w-full rounded-xl bg-secondary pl-10 pr-3 py-3 md:py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {(isAdmin || isModerator) && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualItems((prev) => {
                          const next = [...prev, {
                            product_id: "",
                            name: "",
                            price: 0,
                            quantity: 1,
                            product_code: "",
                            sku: "",
                            image: "",
                            color: "",
                            size: "",
                          }];
                          setEditingItemIdx(next.length - 1);
                          return next;
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                      title="Гараар бараа нэмэх"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Гараар
                    </button>
                    )}
                  </div>

                  {manualProductSearch.trim() && (() => {
                    const q = manualProductSearch.toLowerCase();
                    type Row = { key: string; product: any; color?: string; size?: string; sku?: string; image?: string; stock?: number; };
                    const rows: Row[] = [];
                    for (const p of products) {
                      const vs = (p.variant_stock && typeof p.variant_stock === 'object') ? p.variant_stock : {};
                      const colors: any[] = Array.isArray(p.colors) ? p.colors : [];
                      const sizes: any[] = Array.isArray(p.sizes) ? p.sizes : [];
                      const variantKeys = Object.keys(vs);
                      // Build the union of variant combos so every configured color/size shows up
                      // even when variant_stock has not been filled in yet.
                      const comboSet = new Set<string>(variantKeys);
                      if (colors.length > 0 && sizes.length > 0) {
                        for (const c of colors) for (const s of sizes) {
                          const cn = (c?.name || '').trim();
                          const sn = (typeof s === 'string' ? s : (s?.name || '')).trim();
                          if (cn || sn) comboSet.add(`${cn}|${sn}`);
                        }
                      } else if (colors.length > 0) {
                        for (const c of colors) {
                          const cn = (c?.name || '').trim();
                          if (cn) comboSet.add(`${cn}|`);
                        }
                      } else if (sizes.length > 0) {
                        for (const s of sizes) {
                          const sn = (typeof s === 'string' ? s : (s?.name || '')).trim();
                          if (sn) comboSet.add(`|${sn}`);
                        }
                      }
                      if (comboSet.size > 0) {
                        for (const key of comboSet) {
                          const [color, size] = key.split('|');
                          const cmeta = colors.find((c: any) => (c?.name || '').trim() === (color || '').trim());
                          const sku = cmeta?.sku || p.product_code || '';
                          const image = cmeta?.image || p.thumbnail_url || p.image_url;
                          const stock = vs[key] !== undefined ? Number(vs[key]) || 0 : undefined;
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
                              {isVariant && r.stock !== undefined && (
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
                        <button
                          type="button"
                          onClick={() => {
                            const customName = manualProductSearch.trim();
                            setManualItems((prev) => {
                              const next = [...prev, {
                                product_id: "",
                                name: customName || "Бусад",
                                price: 0,
                                quantity: 1,
                                product_code: "",
                                sku: "",
                                image: "",
                                color: "",
                                size: "",
                              }];
                              setEditingItemIdx(next.length - 1);
                              return next;
                            });
                            setManualProductSearch("");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-t border-border bg-primary/5 hover:bg-primary/10"
                        >
                          <span className="w-10 h-10 rounded flex items-center justify-center bg-primary/10 text-primary shrink-0">
                            <Plus className="h-4 w-4" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-primary truncate">
                              Бусад {manualProductSearch.trim() ? `— "${manualProductSearch.trim()}"` : "(жагсаалтад байхгүй бараа)"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Нэр, үнэ, тоог гараар оруулна</p>
                          </div>
                        </button>

                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    {manualItems.map((it, idx) => {
                      const isEditing = editingItemIdx === idx;
                      const updateItem = (patch: Partial<typeof it>) =>
                        setManualItems((prev) => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
                      const prod = it.product_id ? products.find((pp) => pp.id === it.product_id) : null;
                      const prodColors: any[] = prod && Array.isArray((prod as any).colors) ? (prod as any).colors : [];
                      const prodSizes: any[] = prod && Array.isArray((prod as any).sizes) ? (prod as any).sizes : [];
                      const prodVs: Record<string, any> = prod && (prod as any).variant_stock && typeof (prod as any).variant_stock === 'object' ? (prod as any).variant_stock : {};
                      const stockFor = (colorName: string, sizeName: string) => {
                        const key = `${(colorName || '').trim()}|${(sizeName || '').trim()}`;
                        return prodVs[key] !== undefined ? Number(prodVs[key]) || 0 : undefined;
                      };
                      const pickColor = (c: any) => {
                        const cn = (c?.name || '').trim();
                        const stock = stockFor(cn, it.size || '');
                        updateItem({
                          color: cn,
                          image: c?.image || it.image,
                          sku: c?.sku || it.sku,
                          variant_stock: stock,
                        });
                      };
                      const pickSize = (s: any) => {
                        const sn = (typeof s === 'string' ? s : (s?.name || '')).trim();
                        const stock = stockFor(it.color || '', sn);
                        updateItem({ size: sn, variant_stock: stock });
                      };
                      return (
                      <div key={idx} className="bg-secondary/40 rounded-xl p-2">
                        <div className="flex items-center gap-2">
                          {it.image && <img src={it.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-secondary" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium truncate">{it.name}</p>
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
                            onClick={() => setEditingItemIdx(isEditing ? null : idx)}
                            className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                            title="Засах"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setManualItems((prev) => prev.filter((_, i) => i !== idx)); if (isEditing) setEditingItemIdx(null); }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                            title="Устгах"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {(prodColors.length > 0 || prodSizes.length > 0) && (
                          <div className="mt-2 pt-2 border-t border-border/60 space-y-1.5">
                            {prodColors.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-semibold text-muted-foreground shrink-0">Өнгө:</span>
                                {prodColors.map((c: any, ci: number) => {
                                  const cn = (c?.name || '').trim();
                                  if (!cn) return null;
                                  const active = (it.color || '').trim() === cn;
                                  const stock = prodSizes.length === 0 ? stockFor(cn, '') : undefined;
                                  const oos = stock !== undefined && stock <= 0;
                                  return (
                                    <button
                                      key={ci}
                                      type="button"
                                      onClick={() => pickColor(c)}
                                      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-secondary'
                                      } ${oos ? 'opacity-50' : ''}`}
                                      title={oos ? 'Дууссан' : cn}
                                    >
                                      {c?.image && <img src={c.image} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                                      <span>{cn}</span>
                                      {stock !== undefined && <span className="opacity-70">({stock})</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {prodSizes.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-semibold text-muted-foreground shrink-0">Хэмжээ:</span>
                                {prodSizes.map((s: any, si: number) => {
                                  const sn = (typeof s === 'string' ? s : (s?.name || '')).trim();
                                  if (!sn) return null;
                                  const active = (it.size || '').trim() === sn;
                                  const stock = stockFor(it.color || '', sn);
                                  const oos = stock !== undefined && stock <= 0;
                                  return (
                                    <button
                                      key={si}
                                      type="button"
                                      onClick={() => pickSize(s)}
                                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-secondary'
                                      } ${oos ? 'opacity-50' : ''}`}
                                    >
                                      {sn}{stock !== undefined ? ` (${stock})` : ''}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
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
                      <option value="bank_personal">Данс / Хувь</option>
                      <option value="bank_organization">Данс / Байгууллага</option>
                      <option value="qpay">QPay</option>
                      <option value="storepay">Storepay</option>
                      <option value="pocket">Pocket</option>
                      <option value="sono">Соно</option>
                      <option value="exchange">🔄 Бараа солих (үнэ 0₮)</option>
                    </select>
                    {manualForm.payment_method === "exchange" && (
                      <p className="mt-1.5 text-[11px] text-slate-600 bg-slate-500/10 rounded-lg px-2 py-1.5 leading-snug">
                        🔄 Бараа солих горим: сонгосон бүх барааны үнэ автоматаар 0₮ болно.
                      </p>
                    )}
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
                  {(isAdmin || isModerator) && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Захиалгын төлөв</label>
                    <select
                      value={manualForm.status}
                      onChange={(e) => setManualForm((f) => ({ ...f, status: e.target.value as any }))}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="pending">Хүлээгдэж буй</option>
                      <option value="confirmed">Төлбөр орсон</option>
                      <option value="preparing">Бэлдэж байна</option>
                      <option value="delivering">Хүргэлтэнд гарсан</option>
                      <option value="completed">Дууссан</option>
                      <option value="cancelled">Цуцлагдсан</option>
                    </select>
                  </div>
                  )}
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

            <div className="sticky bottom-0 bg-card border-t border-border px-4 md:px-5 py-3 flex items-center justify-end gap-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:pb-3">
              <button
                onClick={() => setShowManualOrder(false)}
                disabled={manualSubmitting}
                className="flex-1 md:flex-none px-4 py-3 md:py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                onClick={handleCreateManualOrder}
                disabled={manualSubmitting}
                className="flex-[2] md:flex-none px-5 py-3 md:py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
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
              : item.id === "bonus"
                ? (tab === "bonus" || BONUS_TABS.includes(tab))
                : tab === item.id;
            const onClick = () => setTab(
              item.id === "settings" ? "categories" :
              item.id === "bonus" ? "loyalty" :
              item.id
            );
            return (
              <button key={item.id} onClick={onClick}
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
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full">{SETTINGS_TABS.includes(tab) ? settingsSubItems.find(s => s.id === tab)?.label : BONUS_TABS.includes(tab) ? bonusSubItems.find(s => s.id === tab)?.label : sidebarItems.find(s => s.id === tab)?.label}</span>
          </div>
        </header>
        <div className="sticky top-[52px] z-40 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex overflow-x-auto no-scrollbar gap-1 px-3 py-2">
            {sidebarItems.map((t) => {
              const Icon = t.icon;
              const active = t.id === "settings"
                ? (tab === "settings" || SETTINGS_TABS.includes(tab))
                : t.id === "bonus"
                  ? (tab === "bonus" || BONUS_TABS.includes(tab))
                  : tab === t.id;
              const onClick = () => setTab(
                t.id === "settings" ? "categories" :
                t.id === "bonus" ? "loyalty" :
                t.id
              );
              return (
                <button key={t.id} onClick={onClick}
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
                : BONUS_TABS.includes(tab)
                  ? `Бонус · ${bonusSubItems.find(s => s.id === tab)?.label}`
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
              {tab === "announcements" && "Вэбрүү анх орсон үед popup хэлбэрээр гарах мэдэгдэл"}
              {tab === "payments" && `Нийт ${paymentProviders.length} төлбөрийн суваг`}
              
              {tab === "analytics" && "Вэб сайтын хандалтын мэдээлэл"}
              {tab === "collections" && "Барааны багц үүсгэж линкээр хуваалцах"}
              {tab === "diagnostics" && "Зургийн оношлогоо & Cloud зардал"}
              {tab === "stocklog" && "Elle Sport нөөцөөс хасагдсан түүх"}
              {tab === "drivers" && `Нийт ${drivers.length} жолооч`}
              {tab === "branding" && "Вэб сайтын лого, favicon болон SEO тохиргоо"}
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

        {/* Settings / Bonus sub-tab bar */}
        {(SETTINGS_TABS.includes(tab) || BONUS_TABS.includes(tab)) && (
          <div className="sticky top-0 md:top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="flex overflow-x-auto no-scrollbar gap-1 px-3 md:px-8 py-2">
              {(BONUS_TABS.includes(tab) ? bonusSubItems : settingsSubItems).map((s) => {
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
          {/* Report Dashboard */}
          {tab === "report" && <ReportDashboard />}

          {/* Branding Settings */}
          {tab === "branding" && <BrandingSettingsManager />}

          {/* Stats */}
          {tab === "stats" && (

            <div className="space-y-6">
              {/* Орлого */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold tracking-tight">Орлого</h2>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Баталгаажсан захиалга</span>
                </div>
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <button
                    onClick={() => setRevenueOpen((v) => !v)}
                    className="w-full text-left p-4 md:p-6 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3 md:mb-4">
                          <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Нийт орлого</p>
                        <p className="text-2xl md:text-3xl font-extrabold">{formatPrice(totalRevenue)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {revenueBreakdown.orderCount} захиалга · дундаж {formatPrice(revenueBreakdown.avgOrder)}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0 mt-1">
                        {revenueOpen ? "Хаах" : "Задаргаа"}
                        <ChevronDown className={`h-4 w-4 transition-transform ${revenueOpen ? "rotate-180" : ""}`} />
                      </span>
                    </div>
                  </button>

                  {revenueOpen && (
                    <div className="border-t border-border p-4 md:p-6 space-y-5 animate-in fade-in duration-200">
                      {/* Үндсэн задаргаа */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-border p-3">
                          <p className="text-[10px] text-muted-foreground mb-1">Зөвхөн борлуулалт</p>
                          <p className="text-lg font-extrabold text-emerald-600">{formatPrice(productRevenue)}</p>
                        </div>
                        <div className="rounded-xl border border-border p-3">
                          <p className="text-[10px] text-muted-foreground mb-1">Хүргэлтийн төлбөр</p>
                          <p className="text-lg font-extrabold text-blue-600">{formatPrice(totalDeliveryRevenue)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Төлбөртэй {revenueBreakdown.deliveryPaidCount} · Үнэгүй {revenueBreakdown.deliveryFreeCount}
                          </p>
                        </div>
                      </div>

                      {[
                        { title: "Сувгаар (вэб / гараар)", rows: revenueBreakdown.channel },
                        { title: "Захиалгын эх үүсвэрээр", rows: revenueBreakdown.bySource },
                        { title: "Төлбөрийн хэлбэрээр", rows: revenueBreakdown.byPayment },
                        { title: "Төлөвөөр", rows: revenueBreakdown.byStatus },
                      ].map((sec) => (
                        <div key={sec.title}>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{sec.title}</p>
                          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                            {sec.rows.length === 0 && (
                              <div className="p-3 text-xs text-muted-foreground">Мэдээлэл алга</div>
                            )}
                            {sec.rows.map((r: any) => (
                              <div key={r.key} className="p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate">{r.label}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {r.count} захиалга · борлуулалт {formatPrice(r.product)} · хүргэлт {formatPrice(r.delivery)}
                                  </p>
                                </div>
                                <p className="text-sm font-extrabold shrink-0">{formatPrice(r.total)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => setTab("orders")}
                        className="w-full rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-medium py-2.5 transition-colors"
                      >
                        Захиалгууд руу очих
                      </button>
                    </div>
                  )}
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

              {/* Select-all / clear controls */}
              {filteredProducts.length > 0 && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {(() => {
                    const allSelected = filteredProducts.every((p: any) => productSelected.has(p.id));
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(productSelected);
                          if (allSelected) filteredProducts.forEach((p: any) => next.delete(p.id));
                          else filteredProducts.forEach((p: any) => next.add(p.id));
                          setProductSelected(next);
                        }}
                        className="text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 px-3 py-2"
                      >
                        {allSelected
                          ? `✕ Сонголт цуцлах (${filteredProducts.length})`
                          : `☑ Бүгдийг сонгох (${filteredProducts.length})`}
                      </button>
                    );
                  })()}
                  {productSelected.size > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {productSelected.size} сонгосон
                    </span>
                  )}
                </div>
              )}



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

                  {/* Extra images & videos */}
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-2 block">Нэмэлт зураг / бичлэг ({extraImages.length})</label>
                    <div className="flex flex-wrap gap-2">
                      {extraImages.map((url, idx) => {
                        const isVideo = url.startsWith("data:video/") || /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url);
                        return (
                          <div key={idx} className="relative h-16 w-16 rounded-lg bg-secondary overflow-hidden group">
                            {isVideo ? (
                              <>
                                <video src={url} className="h-full w-full object-cover" muted playsInline />
                                <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[8px] px-1 rounded">▶ Видео</span>
                              </>
                            ) : (
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => setExtraImages((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => extraFileInputRef.current?.click()}
                        className="h-16 w-16 rounded-lg border-2 border-dashed border-border bg-secondary flex flex-col items-center justify-center hover:border-primary/40 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-muted-foreground/60" />
                        <span className="text-[8px] text-muted-foreground/60">Зураг</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => extraVideoInputRef.current?.click()}
                        className="h-16 w-16 rounded-lg border-2 border-dashed border-border bg-secondary flex flex-col items-center justify-center hover:border-primary/40 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-muted-foreground/60" />
                        <span className="text-[8px] text-muted-foreground/60">Видео</span>
                      </button>
                      <input
                        ref={extraFileInputRef}
                        type="file"
                         accept="image/*,.png,.jpg,.jpeg,.jfif,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff,.ico,.dng,.raw,.cr2,.nef,.psd"
                        multiple
                        className="hidden"
                        onChange={handleExtraImageUpload}
                      />
                      <input
                        ref={extraVideoInputRef}
                        type="file"
                        accept="video/*,.mp4,.mov,.webm,.m4v,.ogv"
                        multiple
                        className="hidden"
                        onChange={handleExtraVideoUpload}
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
                    if (norm.includes("elle") && norm.includes("sport")) return null;
                    return (
                      <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                        <label className="text-[11px] font-semibold text-foreground">Үлдэгдэл (ширхэг)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min={0} placeholder="0"
                            value={form.stock_quantity || ""}
                            onChange={(e) => setForm({ ...form, stock_quantity: Math.max(0, +e.target.value || 0) })}
                            className="w-40 rounded-lg bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="text-xs text-muted-foreground">ширхэг</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Average reorder days — for SMS reorder reminders */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                    <label className="text-[11px] font-semibold text-foreground">Дундаж дахин захиалгын хугацаа</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} placeholder="жнь 30"
                        value={form.average_reorder_days || ""}
                        onChange={(e) => setForm({ ...form, average_reorder_days: Math.max(0, +e.target.value || 0) })}
                        className="w-40 rounded-lg bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-xs text-muted-foreground">хоног</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Хэрэглэгчид энэ хоногийн дараа "дахин захиалах уу?" SMS илгээнэ. 0 үед сануулга явахгүй.</p>
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
                          {media.type !== "text" && (
                            <div className="h-14 w-14 rounded-lg bg-secondary overflow-hidden shrink-0 cursor-pointer relative group"
                              onClick={() => {
                                const input = document.createElement("input");
                                if (media.type === "image") {
                                  input.type = "file";
                                  input.accept = "image/*,.png,.jpg,.jpeg,.jfif,.gif,.webp,.bmp,.svg,.heic,.heif,.avif,.tiff";
                                  input.onchange = async (ev: any) => {
                                    const file = ev.target.files?.[0];
                                    if (!file) return;
                                    const isAnimated = /\.(webp|gif)$/i.test(file.name) || file.type === "image/webp" || file.type === "image/gif";
                                    const maxSize = isAnimated ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
                                    if (file.size > maxSize) { toast.error(`${isAnimated ? "20MB" : "5MB"}-ээс бага байх ёстой`); return; }
                                    try {
                                      const webpUrl = await optimizeImage(file);
                                      const dm = [...form.detail_media];
                                      dm[idx] = { ...dm[idx], url: webpUrl };
                                      setForm({ ...form, detail_media: dm });
                                      toast.success("Зураг солигдлоо");
                                    } catch { toast.error("Зураг оновчлоход алдаа"); }
                                  };
                                } else {
                                  input.type = "file";
                                  input.accept = "video/*,.mp4,.mov,.avi,.webm,.mkv";
                                  input.onchange = async (ev: any) => {
                                    const file = ev.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 50 * 1024 * 1024) { toast.error("50MB-ээс бага байх ёстой"); return; }
                                    try {
                                      const videoUrl = await uploadVideo(file, "detail");
                                      const dm = [...form.detail_media];
                                      dm[idx] = { ...dm[idx], url: videoUrl };
                                      setForm({ ...form, detail_media: dm });
                                      toast.success("Бичлэг солигдлоо");
                                    } catch { toast.error("Видео хадгалахад алдаа"); }
                                  };
                                }
                                input.click();
                              }}
                              title={media.type === "video" ? "Бичлэг солих" : "Зураг солих"}
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
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-white" />
                              </div>
                              {media.type === "video" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                                        toast.success("Thumbnail солигдлоо");
                                      } catch { toast.error("Зураг оновчлоход алдаа"); }
                                    };
                                    input.click();
                                  }}
                                  className="absolute bottom-0 right-0 bg-black/70 hover:bg-black text-white text-[9px] px-1 py-0.5 rounded-tl-md"
                                  title="Thumbnail солих"
                                >
                                  Thumb
                                </button>
                              )}
                            </div>
                          )}

                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <select value={media.type}
                                onChange={(e) => {
                                  const dm = [...form.detail_media];
                                  dm[idx] = { ...dm[idx], type: e.target.value as "image" | "video" | "text" };
                                  setForm({ ...form, detail_media: dm });
                                }}
                                className="rounded-lg bg-secondary px-2 py-1 text-xs focus:outline-none">
                                <option value="image">Зураг</option>
                                <option value="video">Бичлэг</option>
                                <option value="text">Текст</option>
                              </select>
                              {media.type !== "text" && (
                                <input placeholder={media.type === "video" ? "YouTube/Facebook/видео URL" : "Зураг URL"} value={media.url.startsWith("data:") ? (media.type === "video" ? "🎬 Бичлэг оруулсан" : "📷 Зураг оруулсан") : media.url}
                                  readOnly={media.url.startsWith("data:")}
                                  onChange={(e) => {
                                    const dm = [...form.detail_media];
                                    dm[idx] = { ...dm[idx], url: e.target.value };
                                    setForm({ ...form, detail_media: dm });
                                  }}
                                  className="flex-1 rounded-lg bg-secondary px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
                              )}
                            </div>
                            {media.type === "text" ? (
                              <textarea placeholder="Текст агуулга бичих..." value={media.caption}
                                onChange={(e) => {
                                  const dm = [...form.detail_media];
                                  dm[idx] = { ...dm[idx], caption: e.target.value };
                                  setForm({ ...form, detail_media: dm });
                                }}
                                rows={4}
                                className="w-full rounded-lg bg-secondary px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 resize-y" />
                            ) : (
                              <input placeholder="Тайлбар (заавал биш)" value={media.caption}
                                onChange={(e) => {
                                  const dm = [...form.detail_media];
                                  dm[idx] = { ...dm[idx], caption: e.target.value };
                                  setForm({ ...form, detail_media: dm });
                                }}
                                className="w-full rounded-lg bg-secondary px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const dm = [...form.detail_media];
                                [dm[idx - 1], dm[idx]] = [dm[idx], dm[idx - 1]];
                                setForm({ ...form, detail_media: dm });
                              }}
                              className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Дээш">
                              <ChevronDown className="h-4 w-4 rotate-180" />
                            </button>
                            <button type="button"
                              disabled={idx === form.detail_media.length - 1}
                              onClick={() => {
                                const dm = [...form.detail_media];
                                [dm[idx + 1], dm[idx]] = [dm[idx], dm[idx + 1]];
                                setForm({ ...form, detail_media: dm });
                              }}
                              className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Доош">
                              <ChevronDown className="h-4 w-4" />
                            </button>
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
                        <button type="button"
                          onClick={() => setForm({ ...form, detail_media: [...form.detail_media, { type: "text", url: "", caption: "", thumbnail: "" }] })}
                          className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1">
                          <Plus className="h-3.5 w-3.5" /> Текст нэмэх
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
                              <button onClick={() => handleEditProductSize(p)}
                                className="p-2 rounded-lg hover:bg-orange-500/10 text-orange-600 transition-colors" title="Хэмжээ удирдах">
                                <Ruler className="h-3.5 w-3.5" />
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
                    <button onClick={() => handleEditProductSize(p)} className="p-2 rounded-lg bg-orange-500/10 text-orange-600" title="Хэмжээ удирдах"><Ruler className="h-3.5 w-3.5" /></button>
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

          {activeProductForSize && (
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveProductForSize(null)}>
              <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-border" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                    <h2 className="font-bold">{activeProductForSize.name} — Хэмжээ</h2>
                    <button onClick={() => setActiveProductForSize(null)} className="p-2 hover:bg-secondary rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 pt-0">
                    <ProductSizeManager product={activeProductForSize} onUpdate={fetchProducts} />
                </div>
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
                    onClick={() => navigate("/quick-order")}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                    title="Хурдан захиалга (AI/дуут оролт)"
                  >
                    <Zap className="h-4 w-4" />
                    Хурдан захиалга
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/admin/manual-order`;
                      navigator.clipboard?.writeText(url).catch(() => {});
                      toast.success("Гар утасны линк хуулагдлаа: " + url);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                    title="Гар утсаар нээх линк хуулах (/admin/manual-order)"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span className="hidden sm:inline">Утасны линк</span>
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


              <RecentlyDeletedOrders
                refreshKey={deletedRefreshKey}
                onRestored={handleRefresh}
              />


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
                const UNPAID_TRACKING_START = new Date("2026-06-14T00:00:00+08:00").getTime();
                const isDeliveredOrder = (o: any) =>
                  o.delivery_status === "delivered" || !!o.delivered_at || o.status === "completed";
                const isUnpaidDelivery = (o: any) =>
                  isDeliveredOrder(o)
                  && o.payment_status !== "confirmed"
                  && o.payment_method !== "exchange"
                  && new Date(o.created_at).getTime() >= UNPAID_TRACKING_START;
                const deliveredCount = orders.filter((o) => isDeliveredOrder(o) && !isUnpaidDelivery(o)).length;
                const unpaidDeliveryCount = orders.filter(isUnpaidDelivery).length;
                const activeCount = orders.length - deliveredCount - unpaidDeliveryCount;
                const isWebOrder = (o: any) => !o.source || o.source === "web";
                const baseList = ordersSubTab === "delivered"
                  ? orders.filter((o) => isDeliveredOrder(o) && !isUnpaidDelivery(o) && (deliveredSourceTab === "all" || (deliveredSourceTab === "web" ? isWebOrder(o) : !isWebOrder(o))))
                  : ordersSubTab === "unpaid_delivery"
                    ? orders.filter(isUnpaidDelivery)
                    : orders.filter((o) => !isDeliveredOrder(o) && !isUnpaidDelivery(o));
                const deliveredAll = orders.filter((o) => isDeliveredOrder(o) && !isUnpaidDelivery(o));
                const deliveredWebCount = deliveredAll.filter(isWebOrder).length;
                const deliveredManualCount = deliveredAll.length - deliveredWebCount;
                const filteredOrders = orderSearchPhone
                  ? baseList.filter(o => o.phone?.includes(orderSearchPhone) || o.order_ref?.toLowerCase().includes(orderSearchPhone.toLowerCase()))
                  : baseList;
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


                return (
                  <>
                    {/* Sub-tabs: Идэвхтэй / Хүргэлтэнд өгсөн, төлбөр ороогүй / Хүргэгдсэн */}
                    <div className="bg-card rounded-xl border border-border p-2 overflow-x-auto no-scrollbar">
                      <div className="flex items-center gap-2 min-w-max">
                        <button
                          type="button"
                          onClick={() => { setOrdersSubTab("active"); setBulkSelected(new Set()); }}
                          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${ordersSubTab === "active" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                        >
                          <Package className="h-3.5 w-3.5" />
                          Идэвхтэй захиалга <span className="ml-0.5 opacity-80">({activeCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOrdersSubTab("unpaid_delivery"); setBulkSelected(new Set()); }}
                          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${ordersSubTab === "unpaid_delivery" ? "bg-amber-500 text-white shadow-md shadow-amber-500/25" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          Хүргэлтэнд өгсөн, төлбөр ороогүй <span className="ml-0.5 opacity-80">({unpaidDeliveryCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOrdersSubTab("delivered"); setBulkSelected(new Set()); }}
                          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${ordersSubTab === "delivered" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Дууссан <span className="ml-0.5 opacity-80">({deliveredCount})</span>
                        </button>
                      </div>
                    </div>
                    {ordersSubTab === "delivered" && (
                      <div className="bg-card rounded-xl border border-border p-2 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2 min-w-max">
                          <button
                            type="button"
                            onClick={() => { setDeliveredSourceTab("all"); setBulkSelected(new Set()); }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${deliveredSourceTab === "all" ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                          >
                            Бүгд <span className="ml-0.5 opacity-80">({deliveredAll.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeliveredSourceTab("web"); setBulkSelected(new Set()); }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${deliveredSourceTab === "web" ? "bg-blue-500 text-white shadow" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                          >
                            🌐 Вэб сайтаас <span className="ml-0.5 opacity-80">({deliveredWebCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeliveredSourceTab("manual"); setBulkSelected(new Set()); }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${deliveredSourceTab === "manual" ? "bg-purple-500 text-white shadow" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                          >
                            ✍️ Гараар оруулсан <span className="ml-0.5 opacity-80">({deliveredManualCount})</span>
                          </button>
                        </div>
                      </div>
                    )}
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
                            variant="outline"
                            onClick={() => {
                              const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
                              const todayIds = filteredOrders
                                .filter((o: any) => new Date(o.created_at).getTime() >= startOfDay.getTime())
                                .map((o: any) => o.id);
                              if (todayIds.length === 0) { toast.error("Өнөөдрийн захиалга алга"); return; }
                              setBulkSelected(new Set(todayIds));
                              toast.success(`Өнөөдрийн ${todayIds.length} захиалга сонгогдлоо`);
                            }}
                            className="gap-1.5"
                            title="Өнөөдөр үүсгэсэн бүх захиалгыг сонгох"
                          >
                            <Calendar className="h-4 w-4" />
                            Өнөөдрийг сонгох
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const chosen = orders.filter((o: any) => bulkSelected.has(o.id));
                              if (chosen.length === 0) { toast.error("Захиалга сонгоно уу"); return; }
                              handlePrintRequest(chosen);
                            }}
                            disabled={bulkSelected.size === 0}
                            className="gap-1.5"
                          >
                            <FileText className="h-4 w-4" />
                            Хэвлэх ({bulkSelected.size})
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const chosen = orders.filter((o: any) => bulkSelected.has(o.id));
                              if (chosen.length === 0) { toast.error("Захиалга сонгоно уу"); return; }
                              const invalid = chosen.filter((o: any) => o.status === "delivering" || o.status === "completed" || o.status === "cancelled" || o.delivery_status === "out_for_delivery" || o.delivery_status === "delivered" || o.delivery_status === "cancelled");
                              if (invalid.length === chosen.length) { toast.error("Сонгосон захиалгууд аль хэдийн хүргэлтэнд гарсан эсвэл дууссан байна"); return; }
                              const validIds = chosen.filter((o: any) => !(o.status === "delivering" || o.status === "completed" || o.status === "cancelled" || o.delivery_status === "out_for_delivery" || o.delivery_status === "delivered" || o.delivery_status === "cancelled")).map((o: any) => o.id);
                              if (invalid.length > 0) toast.message(`${invalid.length} захиалга алгасагдана (аль хэдийн хүргэгдсэн/цуцлагдсан)`);
                              loadPartnerDrivers();
                              setBulkDeliverDialog({ orderIds: validIds, driverId: "" });
                            }}
                            disabled={bulkSelected.size === 0}
                            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                            title="Сонгосон бүх захиалгыг нэг жолоочид өгөх"
                          >
                            <Truck className="h-4 w-4" />
                            Жолоочид өгөх ({bulkSelected.size})
                          </Button>
                        </div>
                      </div>
                    </div>


                    {filteredOrders.map((o: any) => {
                      const delOpt = deliveryOptions.find((d: any) => d.id === o.delivery_option_id);
                      const isExpanded = expandedOrderId === o.id;
                      const orderItems = Array.isArray(o.items) ? o.items : [];
                      const isChecked = bulkSelected.has(o.id);
                      return (
                        <div key={o.id} className={`bg-card rounded-xl border overflow-hidden ${(o.payment_status !== "confirmed" && o.payment_status !== "paid" && o.payment_method !== "exchange") ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "border-border"}`}>
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
                          {/* Order ID hidden by request */}
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
                          {(o.payment_status === "confirmed" || o.payment_status === "paid" || o.payment_method === "exchange") && (
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
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {/* DLV code hidden by request */}
                            {o.delivery_status && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                o.delivery_status === "delivered" ? "bg-green-500/10 text-green-600" :
                                o.delivery_status === "out_for_delivery" ? "bg-violet-500/10 text-violet-600" :
                                o.delivery_status === "cancelled" ? "bg-red-500/10 text-red-600" :
                                "bg-blue-500/10 text-blue-600"
                              }`}>
                                {o.delivery_status === "confirmed" ? "Баталгаажсан" :
o.delivery_status === "out_for_delivery" ? "Хүргэлтэнд" :
                                 o.delivery_status === "delivered" ? "Хүргэгдсэн" :
                                 o.delivery_status === "cancelled" ? "Цуцлагдсан" :
                                 o.delivery_status === "processing" ? "Боловсруулж байна" : o.delivery_status}
                              </span>
                            )}
                            {(() => {
                              const d = drivers.find((drv) => drv.id === o.driver_id);
                              if (!d && !o.delivery_signature_name) return null;
                              return (
                                <span className="text-[10px] text-muted-foreground">
                                  👤 {d?.full_name || o.delivery_signature_name}
                                  {d?.phone ? ` · ${d.phone}` : ""}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      {/* Хүргэлт дууссан мэдээллийг 'Хүргэгдсэн' дэд таб руу шилжүүлсэн */}
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
                        {o.delivery_order_id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openOrderInPortal(o); }}
                            disabled={openingPortal === o.id}
                            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                            title="Хүргэлтийн порталаар харах"
                          >
                            {openingPortal === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                          </button>
                        )}
                        {(ordersSubTab === "active" || ordersSubTab === "unpaid_delivery" || isDeliveredOrder(o)) && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const isPaid = o.payment_status === "confirmed" || o.payment_status === "paid";
                              const newStatus = isPaid ? "unpaid" : "confirmed";
                              const updates: any = { payment_status: newStatus };
                              if (newStatus === "confirmed" && o.status !== "confirmed" && o.status !== "completed" && o.status !== "cancelled") {
                                updates.status = "confirmed";
                              }
                              const { error } = await supabase
                                .from("orders")
                                .update(updates)
                                .eq("id", o.id);
                              if (error) {
                                toast.error("Төлбөрийн төлөв шинэчлэхэд алдаа: " + error.message);
                                return;
                              }
                              setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, ...updates } : x));
                              toast.success(newStatus === "confirmed" ? "Төлбөр орсон гэж тэмдэглэлээ" : "Төлөгдөөгүй гэж тэмдэглэлээ");
                              if (o.delivery_order_id) {
                                supabase.functions.invoke("notify-delivery-status", {
                                  body: { order_id: o.id, payment_status: newStatus === "confirmed" ? "paid" : "unpaid" },
                                }).catch(console.error);
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${(o.payment_status === "confirmed" || o.payment_status === "paid") ? "hover:bg-amber-500/10 text-amber-600" : "hover:bg-emerald-500/10 text-emerald-600"}`}
                            title={(o.payment_status === "confirmed" || o.payment_status === "paid") ? "Төлөгдөөгүй гэж тэмдэглэх" : "Төлбөр орсон гэж тэмдэглэх"}
                          >
                            <BadgeCheck className="h-4 w-4" />
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
                        {/* Status timeline */}
                        <OrderStatusTimeline orderId={o.id} currentStatus={o.status} />
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

                        {/* Payment editor */}
                        <div className="bg-card rounded-2xl border border-border overflow-hidden">
                          <header className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 border-b border-border">
                            <Wallet className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-bold">Төлбөр</h3>
                          </header>
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-muted-foreground mb-1 block">Төлбөрийн суваг</label>
                              <select
                                value={(o.payment_method || "cash").toLowerCase()}
                                onChange={async (e) => {
                                  const newMethod = e.target.value;
                                  const { error } = await supabase.from("orders").update({ payment_method: newMethod }).eq("id", o.id);
                                  if (error) { toast.error("Алдаа: " + error.message); return; }
                                  setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, payment_method: newMethod } : x));
                                  toast.success("Төлбөрийн суваг шинэчлэгдлээ");
                                }}
                                className="w-full rounded-xl bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="bank_personal">Данс / Хувь</option>
                                <option value="bank_organization">Данс / Байгууллага</option>
                                <option value="qpay">QPay</option>
                                <option value="storepay">Storepay</option>
                                <option value="pocket">Pocket</option>
                                <option value="sono">Соно</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-muted-foreground mb-1 block">
                                Төлөв <span className="font-normal text-muted-foreground/60">(төлбөр төлөгдсөн эсэх)</span>
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { value: "confirmed", title: "Төлбөр авсан", desc: "Бэлэн / шилжүүлэг хүлээн авсан", active: o.payment_status === "confirmed" || o.payment_status === "paid", accent: "text-emerald-600 border-emerald-500/40 bg-emerald-500/5" },
                                  { value: "unpaid", title: "Төлбөр аваагүй", desc: "Хүргэлт дээр төлнө", active: o.payment_status !== "confirmed" && o.payment_status !== "paid", accent: "text-amber-600 border-amber-500/40 bg-amber-500/5" },
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const newStatus = opt.value;
                                      const isCurrentlyPaid = o.payment_status === "confirmed" || o.payment_status === "paid";
                                      if (isCurrentlyPaid === (newStatus === "confirmed")) return;
                                      const updates: any = { payment_status: newStatus };
                                      if (newStatus === "confirmed" && o.status !== "confirmed" && o.status !== "completed" && o.status !== "cancelled") {
                                        updates.status = "confirmed";
                                      }
                                      const { error } = await supabase.from("orders").update(updates).eq("id", o.id);
                                      if (error) { toast.error("Алдаа: " + error.message); return; }
                                      setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, ...updates } : x));
                                      toast.success(newStatus === "confirmed" ? "Төлбөр орсон гэж тэмдэглэлээ" : "Төлөгдөөгүй гэж тэмдэглэлээ");
                                      if (o.delivery_order_id) {
                                        supabase.functions.invoke("notify-delivery-status", {
                                          body: { order_id: o.id, payment_status: newStatus === "confirmed" ? "paid" : "unpaid" },
                                        }).catch(console.error);
                                      }
                                    }}
                                    className={`text-left rounded-xl border-2 px-3 py-2 transition-all ${opt.active ? `${opt.accent} font-semibold shadow-sm` : "border-transparent bg-secondary text-foreground/70 hover:bg-secondary/70"}`}
                                  >
                                    <div className="text-sm font-bold leading-tight">{opt.title}</div>
                                    <div className="text-[11px] opacity-80 mt-0.5 leading-tight">{opt.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            {o.order_ref && (
                              <div className="md:col-span-2 text-xs text-muted-foreground">
                                Лавлах дугаар: <span className="font-medium text-foreground">{o.order_ref}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {delOpt && (
                          <div>
                            <h4 className="text-xs font-bold text-muted-foreground mb-2">Хүргэлтийн мэдээлэл</h4>
                            <div className="bg-secondary/50 rounded-lg p-3 text-xs space-y-1">
                              <p><span className="text-muted-foreground">Хүргэлт:</span> <span className="font-medium">{delOpt.name}</span></p>
                              <p><span className="text-muted-foreground">Үндсэн төлбөр:</span> <span className="font-medium">{o.delivery_fee > 0 ? formatPrice(o.delivery_fee) : "Үнэгүй"}</span></p>
                              {Number(o.delivery_surcharge) > 0 && (
                                <p><span className="text-muted-foreground">Нэмэлт төлбөр:</span> <span className="font-medium text-amber-600">+{formatPrice(Number(o.delivery_surcharge))}</span></p>
                              )}
                              <p><span className="text-muted-foreground">Хугацаа:</span> <span className="font-medium">{delOpt.estimated_days_min}-{delOpt.estimated_days_max} хоног</span></p>
                              {delOpt.address && <p><span className="text-muted-foreground">Хаяг:</span> <span className="font-medium">{delOpt.address}</span></p>}
                              {delOpt.phone && <p><span className="text-muted-foreground">Утас:</span> <span className="font-medium">{delOpt.phone}</span></p>}
                              {delOpt.payment_terms && <p><span className="text-muted-foreground">Төлбөрийн нөхцөл:</span> <span className="font-medium">{delOpt.payment_terms}</span></p>}
                            </div>
                          </div>
                        )}

                        {(isAdmin || isModerator) && (
                          <div>
                            <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5" /> Нэмэлт хүргэлтийн төлбөр
                            </h4>
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                              <p className="text-[11px] text-muted-foreground">
                                Хол зай эсвэл овор ихтэй захиалгын үед нэмэлт төлбөр оруулна уу. Нийт дүнд автоматаар нэмэгдэнэ.
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {[0, 3000, 5000, 10000, 15000, 20000].map((amt) => (
                                  <button
                                    key={amt}
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const oldSur = Number(o.delivery_surcharge) || 0;
                                      const newTotal = (Number(o.total) || 0) - oldSur + amt;
                                      const { error } = await supabase.from("orders").update({ delivery_surcharge: amt, total: newTotal }).eq("id", o.id);
                                      if (error) { toast.error("Алдаа: " + error.message); return; }
                                      setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, delivery_surcharge: amt, total: newTotal } : x));
                                      toast.success(amt > 0 ? `Нэмэлт төлбөр ${formatPrice(amt)}` : "Нэмэлт төлбөр цуцлагдлаа");
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border-2 transition ${
                                      Number(o.delivery_surcharge) === amt
                                        ? "border-amber-500 bg-amber-500 text-white"
                                        : "border-transparent bg-secondary text-foreground/70 hover:bg-secondary/70"
                                    }`}
                                  >
                                    {amt === 0 ? "Байхгүй" : `+${(amt / 1000)}к`}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground shrink-0">Өөр дүн:</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={500}
                                  defaultValue={Number(o.delivery_surcharge) || 0}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={async (e) => {
                                    const amt = Math.max(0, Math.round(Number(e.target.value) || 0));
                                    if (amt === (Number(o.delivery_surcharge) || 0)) return;
                                    const oldSur = Number(o.delivery_surcharge) || 0;
                                    const newTotal = (Number(o.total) || 0) - oldSur + amt;
                                    const { error } = await supabase.from("orders").update({ delivery_surcharge: amt, total: newTotal }).eq("id", o.id);
                                    if (error) { toast.error("Алдаа: " + error.message); return; }
                                    setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, delivery_surcharge: amt, total: newTotal } : x));
                                    toast.success("Нэмэлт төлбөр шинэчлэгдлээ");
                                  }}
                                  className="flex-1 rounded-lg bg-background border border-border px-2 py-1 text-xs"
                                  placeholder="0"
                                />
                                <span className="text-[11px] text-muted-foreground">₮</span>
                              </div>
                              <div className="flex justify-between items-center pt-1.5 border-t border-amber-500/20 text-xs">
                                <span className="text-muted-foreground">Нийт дүн:</span>
                                <span className="font-bold">{formatPrice(Number(o.total) || 0)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Customer info + edit */}
                        <div className="rounded-xl border border-border bg-secondary/20 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-muted-foreground">Хэрэглэгчийн мэдээлэл</h4>
                            {(isAdmin || isModerator) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOrderInfo({
                                    id: o.id,
                                    order_ref: o.order_ref,
                                    guest_name: o.guest_name || "",
                                    phone: o.phone || "",
                                    shipping_address: o.shipping_address || "",
                                    source: o.source || "web",
                                    source_note: o.source_note || "",
                                  });
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <Pencil className="h-3 w-3" /> Засах
                              </button>
                            )}
                          </div>
                          <div className="space-y-1 text-xs">
                            <p><span className="text-muted-foreground">Нэр:</span> <span className="font-medium">{o.guest_name || "—"}</span></p>
                            <p><span className="text-muted-foreground">Утас:</span> <span className="font-medium">{o.phone || "—"}</span></p>
                            <p><span className="text-muted-foreground">Хаяг:</span> <span className="font-medium">{o.shipping_address || "—"}</span></p>
                            {o.source_note && <p><span className="text-muted-foreground">Тэмдэглэл:</span> <span className="font-medium">{o.source_note}</span></p>}
                          </div>
                        </div>


                        {/* Status change */}
                        {(isAdmin || isModerator) && (
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
                        )}

                        {/* Out for delivery driver display */}
                        {(o.status === "delivering" || o.delivery_status === "out_for_delivery") && (o.delivered_at == null && o.delivery_status !== "delivered") && (() => {
                          const assignedDriver = drivers.find((d) => d.id === o.driver_id);
                          return (
                            <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3 text-xs space-y-1.5">
                              <p className="flex items-center gap-1.5 text-amber-600 font-bold">
                                <Truck className="h-3.5 w-3.5" /> Хүргэлтэнд гарсан
                              </p>
                              <p>
                                <span className="text-muted-foreground">Авч явсан:</span>{" "}
                                <span className="font-bold text-foreground">
                                  {assignedDriver?.full_name || o.delivery_signature_name || "—"}
                                  {assignedDriver?.phone ? ` · ${assignedDriver.phone}` : ""}
                                </span>
                              </p>
                              {o.picked_up_at && (
                                <p>
                                  <span className="text-muted-foreground">Авсан цаг:</span>{" "}
                                  <span className="font-bold text-foreground">
                                    {new Date(o.picked_up_at).toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" })} {" "}
                                    {new Date(o.picked_up_at).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  </span>
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadPartnerDrivers();
                                  setDeliverDialog({
                                    orderId: o.id,
                                    driverId: "",
                                    courierName: o.delivery_signature_name || "",
                                    courierPhone: "",
                                    reassign: true,
                                  });
                                }}
                                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/40 hover:bg-amber-500/25"
                              >
                                <Truck className="h-3 w-3" /> Жолооч солих
                              </button>
                            </div>
                          );
                        })()}


                        {/* Delivered status display */}
                        {(o.delivery_status === "delivered" || !!o.delivered_at) && (() => {
                          const assignedDriver = drivers.find((d) => d.id === o.driver_id);
                          return (
                            <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                  <Truck className="h-3.5 w-3.5" /> Хүргэгдсэн
                                </p>
                                {o.is_settled ? (
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    <Lock className="h-3 w-3" />
                                    Борлуулалт хаагдсан
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); settleOrder(o.id); }}
                                    disabled={settlingOrderId === o.id}
                                    className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 transition-colors"
                                    title="Энэ захиалгыг өнөөдрийн борлуулалтанд тооцож хаах"
                                  >
                                    {settlingOrderId === o.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Lock className="h-3 w-3" />}
                                    Борлуулалт хаах
                                  </button>
                                )}
                              </div>
                              {(assignedDriver || o.delivery_signature_name) && (
                                <p>
                                  <span className="text-muted-foreground">Авч явсан:</span>{" "}
                                  <span className="font-bold text-foreground">
                                    {assignedDriver?.full_name || o.delivery_signature_name || "—"}
                                    {assignedDriver?.phone ? ` · ${assignedDriver.phone}` : ""}
                                  </span>
                                </p>
                              )}
                              {o.picked_up_at && (
                                <p>
                                  <span className="text-muted-foreground">Хүргэлтэнд гарсан:</span>{" "}
                                  <span className="font-bold text-foreground">
                                    {new Date(o.picked_up_at).toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" })} {" "}
                                    {new Date(o.picked_up_at).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  </span>
                                </p>
                              )}
                              {o.delivery_completed_photo && (
                                <div className="mt-2 pt-2 border-t border-emerald-500/20">
                                  <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Баталгаажуулах зураг:</p>
                                  <img 
                                    src={o.delivery_completed_photo} 
                                    alt="Delivery Proof" 
                                    className="w-full h-32 object-cover rounded-lg border border-emerald-500/20 cursor-pointer hover:opacity-90 transition-opacity" 
                                    onClick={() => window.open(o.delivery_completed_photo, '_blank')}
                                  />
                                </div>
                              )}
                              {o.delivered_at && (
                                <p>
                                  <span className="text-muted-foreground">Хүргэгдсэн:</span>{" "}
                                  <span className="font-bold text-foreground">
                                    {new Date(o.delivered_at).toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" })} {" "}
                                    {new Date(o.delivered_at).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  </span>
                                </p>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const patch = {
                                      status: "confirmed",
                                      delivery_status: o.delivery_order_id ? "confirmed" : null,
                                      delivered_at: null,
                                      delivery_failed_at: null,
                                      delivery_return_reason: null,
                                      updated_at: new Date().toISOString(),
                                    };
                                    const { error } = await supabase.from("orders").update(patch).eq("id", o.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success("Хүргэлтийн төлөвийг идэвхтэй болгож буцаалаа");
                                    setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, ...patch } : x));
                                    await notifyDeliveryFulfillment(o.id, "confirmed", "Easyshop дээр хүргэгдсэн төлвөөс гараар буцаасан");
                                  }}
                                  className="mt-2 text-[10px] font-semibold text-muted-foreground hover:text-destructive underline"
                                >
                                  Буцаах
                                </button>
                              )}
                            </div>
                          );
                        })()}

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
                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground">Төхөөрөмж</th>
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
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium">{u.full_name || "Нэргүй"}</span>
                                    {u.is_vip && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                                        ⭐ VIP
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {(u.order_count ?? 0)} захиалга · {(u.loyalty_points ?? 0).toLocaleString("mn-MN")} оноо
                                  </span>
                                </div>
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
                              <DeviceBadge info={u.device_info} />
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
                          <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                            {u.full_name || "Нэргүй"}
                            {u.is_vip && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">⭐ VIP</span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email || "Имэйл байхгүй"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.phone || "Утас байхгүй"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{(u.order_count ?? 0)} захиалга · {(u.loyalty_points ?? 0).toLocaleString("mn-MN")} оноо</p>
                          <div className="mt-1"><DeviceBadge info={u.device_info} /></div>
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

          {tab === "delivery-portal" && <DeliveryPortal />}
          {tab === "branches" && <BranchesManager />}

          {/* Web Analytics */}
          {tab === "analytics" && <WebAnalytics />}

          {/* Collections / Багц линк */}
          {tab === "collections" && <CollectionsManager products={products} />}

          {/* Announcements / Popup мэдэгдэл */}
          {tab === "announcements" && <AnnouncementsManager />}
          {tab === "welcome-showcase" && <WelcomeShowcaseManager />}

          {/* Chatbot settings */}
          {tab === "chatbot" && <ChatbotSettingsManager />}

          {/* Recommendation scoring weights */}
          {tab === "recommendations" && <RecommendationSettingsManager />}

          {tab === "loyalty" && <LoyaltySettingsManager />}

          {tab === "reminders" && <ReminderSettingsManager />}

          {tab === "reviews" && <ReviewsManager />}

          {tab === "spin" && <SpinSettingsManager />}

          {tab === "referral" && <ReferralManager />}

          {tab === "promotions" && <WalletCreditsManager />}

          {tab === "coupon-usage" && <CouponUsageManager />}

          {tab === "easyrewards" && <EasyRewardsManager />}

          {tab === "flash-sales" && <FlashSalesManager />}

          {tab === "reels" && <ReelsManager />}






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
          {tab === "returns" && <ReturnsManager />}

          {/* Drivers Tab */}
          {tab === "drivers" && (
            <DriversManager
              drivers={drivers}
              isAdmin={isAdmin}
              onChange={fetchDrivers}
            />
          )}

          {/* Categories Tab */}
          {tab === "categories" && (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-4">
                <h3 className="font-bold text-sm">{editCatId ? "Ангилал засах" : "Шинэ ангилал нэмэх"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Нэр *</label>
                    <input placeholder="Ангилалын нэр" value={catName} onChange={(e) => setCatName(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Slug (URL)</label>
                    <input placeholder="category-slug" value={catSlug} onChange={(e) => setCatSlug(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Эх ангилал</label>
                    <select value={catParent} onChange={(e) => setCatParent(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="none">Үндсэн ангилал (Main)</option>
                      {dbCategories.filter(c => c.id !== editCatId && !c.parent_id).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Icon нэр</label>
                    <input placeholder="Жишээ: Zap, Sofa, Utensils" value={catIcon} onChange={(e) => setCatIcon(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Зураг</label>
                  <div className="flex items-center gap-3">
                    <input ref={catImageFileRef} type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const webpUrl = await optimizeImage(file);
                          setCatImage(webpUrl);
                        } catch { toast.error("Зураг оновчлоход алдаа"); }
                      }}
                    />
                    <button type="button" onClick={() => catImageFileRef.current?.click()}
                      className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                      <ImageIcon className="h-4 w-4" /> Оруулах
                    </button>
                    {catImage && (
                      <div className="relative group h-12 w-12 rounded-lg border border-border overflow-hidden">
                        <img src={catImage} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => setCatImage("")} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSaveCategory}
                    className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors">
                    {editCatId ? "Шинэчлэх" : "Нэмэх"}
                  </button>
                  {editCatId && (
                    <button onClick={() => { setCatName(""); setCatIcon(""); setCatSlug(""); setCatParent("none"); setCatImage(""); setEditCatId(null); }}
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
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Layers className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{c.name}</p>
                          {c.parent_id && (
                            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full font-medium">Дэд</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.icon && <span className="text-[10px] text-muted-foreground">Icon: {c.icon}</span>}
                          <span className="text-[10px] text-muted-foreground">Slug: {c.slug}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { 
                        setCatName(c.name); 
                        setCatIcon(c.icon || ""); 
                        setCatSlug(c.slug || "");
                        setCatParent(c.parent_id || "none");
                        setCatImage(c.image_url || "");
                        setEditCatId(c.id); 
                      }}
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
      
      <PrintChecklistModal
        open={showPrintChecklist}
        onOpenChange={setShowPrintChecklist}
        count={pendingPrintOrders.length}
        onConfirm={() => {
          setShowPrintChecklist(false);
          printOrders(pendingPrintOrders);
        }}
      />
      {deliverDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !savingDeliverDialog && setDeliverDialog(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Truck className="h-4 w-4 text-violet-600" /> {deliverDialog.reassign ? "Жолооч солих" : "Хүргэлтэнд гаргах"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Swift Delivery Hub-д бүртгэлтэй жолоочоос сонгоно уу.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Жолооч</label>
                <button
                  type="button"
                  onClick={() => loadPartnerDrivers(true)}
                  disabled={partnerDriversLoading}
                  className="text-[11px] text-violet-600 hover:underline disabled:opacity-50"
                >
                  {partnerDriversLoading ? "Ачаалж байна..." : "Шинэчлэх"}
                </button>
              </div>
              <select
                value={deliverDialog.driverId}
                onChange={(e) => setDeliverDialog((p) => p ? { ...p, driverId: e.target.value } : p)}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
                disabled={partnerDriversLoading}
              >
                <option value="">— {partnerDriversLoading ? "Ачаалж байна..." : "Сонгох"} —</option>
                {partnerDrivers.map((d) => (
                  <option key={d.driver_id} value={d.driver_id}>
                    {d.name}{d.phone ? ` · ${d.phone}` : ""}
                  </option>
                ))}
              </select>
              {!partnerDriversLoading && partnerDrivers.length === 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">Жолооч олдсонгүй. "Шинэчлэх" дарж дахин оролдоно уу.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeliverDialog(null)}
                disabled={savingDeliverDialog}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-secondary hover:bg-secondary/70 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={confirmDeliverDispatch}
                disabled={savingDeliverDialog || !deliverDialog.driverId}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingDeliverDialog ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                {deliverDialog.reassign ? "Жолооч солих" : "Хүргэлтэнд гаргах"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeliverDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !bulkDispatchProgress && setBulkDeliverDialog(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Truck className="h-4 w-4 text-violet-600" /> Багц хүргэлт
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                <b className="text-foreground">{bulkDeliverDialog.orderIds.length}</b> захиалгыг нэг жолоочид өгнө.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Жолооч</label>
                <button
                  type="button"
                  onClick={() => loadPartnerDrivers(true)}
                  disabled={partnerDriversLoading}
                  className="text-[11px] text-violet-600 hover:underline disabled:opacity-50"
                >
                  {partnerDriversLoading ? "Ачаалж байна..." : "Шинэчлэх"}
                </button>
              </div>
              <select
                value={bulkDeliverDialog.driverId}
                onChange={(e) => setBulkDeliverDialog((p) => p ? { ...p, driverId: e.target.value } : p)}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
                disabled={partnerDriversLoading || !!bulkDispatchProgress}
              >
                <option value="">— {partnerDriversLoading ? "Ачаалж байна..." : "Сонгох"} —</option>
                {partnerDrivers.map((d) => (
                  <option key={d.driver_id} value={d.driver_id}>
                    {d.name}{d.phone ? ` · ${d.phone}` : ""}
                  </option>
                ))}
              </select>
              {!partnerDriversLoading && partnerDrivers.length === 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">Жолооч олдсонгүй. "Шинэчлэх" дарж дахин оролдоно уу.</p>
              )}
            </div>

            {bulkDispatchProgress && (
              <div className="space-y-1">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 transition-all"
                    style={{ width: `${(bulkDispatchProgress.done / Math.max(1, bulkDispatchProgress.total)) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  {bulkDispatchProgress.done} / {bulkDispatchProgress.total}
                  {bulkDispatchProgress.failed > 0 && ` · ${bulkDispatchProgress.failed} алдаа`}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeliverDialog(null)}
                disabled={!!bulkDispatchProgress}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-secondary hover:bg-secondary/70 disabled:opacity-50"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={confirmBulkDeliverDispatch}
                disabled={!!bulkDispatchProgress || !bulkDeliverDialog.driverId}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                {bulkDispatchProgress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                {bulkDispatchProgress ? "Илгээж байна..." : `${bulkDeliverDialog.orderIds.length} захиалга илгээх`}
              </button>
            </div>
          </div>
        </div>
      )}
      <PrintChecklistModal
        open={showPrintChecklist}
        onOpenChange={setShowPrintChecklist}
        onConfirm={() => {
          printOrders(checklistTarget);
          setShowPrintChecklist(false);
        }}
        count={checklistTarget.length}
      />
    </div>
  );
};

export default AdminPage;
