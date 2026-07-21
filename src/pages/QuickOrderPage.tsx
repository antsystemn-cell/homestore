import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mic, MicOff, Send, Check, Pencil, List, Plus, Trash2, Loader2,
  CheckCircle2, Search, X, Sparkles, AlertCircle, Package,
} from "lucide-react";
import { scoreCandidate } from "@/lib/searchNormalize";

interface ProductLite { id: string; name: string; price: number; original_price: number | null; is_on_sale: boolean | null }

interface ParsedItem {
  name: string;
  quantity: number;
  matched_product_id: string | null;
  matched_product_name: string | null;
  price: number;
  confidence: number;
}
interface Parsed {
  phone: string;
  address: string;
  items: ParsedItem[];
  source: string;
  note?: string;
}

interface OrderRow {
  id: string;
  order_ref: string | null;
  phone: string | null;
  shipping_address: string | null;
  items: any;
  status: string;
  source_note: string | null;
  created_at: string;
  total: number | null;
}

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "pending", label: "Шинэ", color: "bg-amber-100 text-amber-800" },
  { value: "confirmed", label: "Баталгаажсан", color: "bg-blue-100 text-blue-800" },
  { value: "delivering", label: "Хүргэгдэж буй", color: "bg-purple-100 text-purple-800" },
  { value: "delivered", label: "Хүргэгдсэн", color: "bg-emerald-100 text-emerald-800" },
  { value: "cancelled", label: "Цуцлагдсан", color: "bg-red-100 text-red-800" },
];
const STATUS_META = (s: string) => STATUS_OPTIONS.find((x) => x.value === s) ?? STATUS_OPTIONS[0];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const DELIVERY_FEE = 8000;
const FREE_DELIVERY_THRESHOLD = 50000;

const money = (n: number) => `${(n || 0).toLocaleString("mn-MN")}₮`;

export default function QuickOrderPage() {
  const [tab, setTab] = useState<"new" | "list">("new");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState<string>("all");

  // Which item is showing the product picker (index)
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,price,original_price,is_on_sale")
        .eq("is_active", true);
      setProducts((data as ProductLite[]) || []);
    })();
  }, []);

  const matchProduct = (name: string): ProductLite | null => {
    if (!name || products.length === 0) return null;
    let best: ProductLite | null = null;
    let bestScore = 0;
    for (const p of products) {
      const s = scoreCandidate(p.name, name);
      if (s > bestScore) { bestScore = s; best = p; }
    }
    return bestScore >= 150 ? best : null;
  };

  const startMic = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Энэ browser Speech Recognition-г дэмжихгүй байна"); return; }
    const rec = new SR();
    rec.lang = "mn-MN";
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = text ? text + " " : "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setText((finalText + interim).replace(/\s+/g, " "));
    };
    rec.onerror = (e: any) => { toast.error("Микрофон алдаа: " + (e.error || "unknown")); setListening(false); };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };
  const stopMic = () => { try { recRef.current?.stop(); } catch {} setListening(false); };

  const handleParse = async () => {
    if (!text.trim()) { toast.error("Текст оруулна уу"); return; }
    setLoading(true);
    try {
      // Send a compact catalog to help AI match products directly.
      const catalog = products.slice(0, 400).map((p) => ({
        id: p.id, name: p.name, price: p.price,
      }));
      const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-quick-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ text, products: catalog }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI алдаа");

      // Fallback fuzzy-match for items AI missed.
      const items: ParsedItem[] = (Array.isArray(data.items) ? data.items : []).map((it: any) => {
        if (it.matched_product_id) return it as ParsedItem;
        const local = matchProduct(String(it.name || ""));
        if (local) {
          return {
            name: it.name,
            quantity: it.quantity,
            matched_product_id: local.id,
            matched_product_name: local.name,
            price: Number(local.price) || 0,
            confidence: 0.6,
          };
        }
        return { ...it, matched_product_id: null, matched_product_name: null, price: 0, confidence: 0 };
      });

      setParsed({
        phone: data.phone || "",
        address: data.address || "",
        items,
        source: data.source || "",
        note: data.note || "",
      });
    } catch (e: any) {
      toast.error(e.message || "Алдаа");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = useMemo(
    () => (parsed?.items || []).reduce((s, it) => s + (it.price || 0) * it.quantity, 0),
    [parsed]
  );
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (subtotal > 0 ? DELIVERY_FEE : 0);
  const total = subtotal + deliveryFee;
  const matchedCount = (parsed?.items || []).filter((it) => it.matched_product_id).length;
  const unmatchedCount = (parsed?.items?.length || 0) - matchedCount;

  const setItem = (i: number, patch: Partial<ParsedItem>) => {
    if (!parsed) return;
    const items = [...parsed.items];
    items[i] = { ...items[i], ...patch };
    setParsed({ ...parsed, items });
  };
  const removeItem = (i: number) => {
    if (!parsed) return;
    setParsed({ ...parsed, items: parsed.items.filter((_, j) => j !== i) });
  };
  const addItem = () => {
    if (!parsed) return;
    setParsed({
      ...parsed,
      items: [...parsed.items, { name: "", quantity: 1, matched_product_id: null, matched_product_name: null, price: 0, confidence: 0 }],
    });
  };
  const chooseProduct = (i: number, p: ProductLite) => {
    setItem(i, {
      matched_product_id: p.id,
      matched_product_name: p.name,
      name: p.name,
      price: Number(p.price) || 0,
      confidence: 1,
    });
    setPickerIdx(null); setPickerQuery("");
  };

  const pickerResults = useMemo(() => {
    if (pickerIdx === null) return [];
    const q = pickerQuery.trim() || (parsed?.items[pickerIdx]?.name || "");
    if (!q) return products.slice(0, 20);
    return products
      .map((p) => ({ p, s: scoreCandidate(p.name, q) }))
      .filter((x) => x.s > 20)
      .sort((a, b) => b.s - a.s)
      .slice(0, 20)
      .map((x) => x.p);
  }, [pickerIdx, pickerQuery, products, parsed]);

  const handleSave = async () => {
    if (!parsed) return;
    if (!parsed.phone) { toast.error("Утас заавал"); return; }
    if (!parsed.address) { toast.error("Хаяг заавал"); return; }
    if (parsed.items.length === 0) { toast.error("Бараа хоосон байна"); return; }
    setSaving(true);
    try {
      const isConfirmed = parsed.items.every((it) => it.matched_product_id);
      const { data, error } = await supabase.rpc("create_guest_order", {
        payload: {
          phone: parsed.phone,
          shipping_address: parsed.address,
          items: parsed.items.map((it) => ({
            name: it.matched_product_name || it.name,
            quantity: it.quantity,
            price: it.price || 0,
            product_id: it.matched_product_id,
          })),
          total: isConfirmed ? total : 0,
          status: "pending",
          payment_method: "cash",
          payment_status: "unpaid",
          delivery_fee: isConfirmed ? deliveryFee : 0,
          source_note: parsed.source ? `quick-order:${parsed.source}` : "quick-order",
          guest_name: null,
        } as any,
      });
      if (error) throw error;
      const ref = Array.isArray(data) && data[0]?.order_ref ? data[0].order_ref : "";
      toast.success(`Хадгалагдлаа ${ref}`);
      setText(""); setParsed(null);
      void loadOrders();
    } catch (e: any) {
      toast.error(e.message || "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  };

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id,order_ref,phone,shipping_address,items,status,source_note,created_at,total")
      .like("source_note", "quick-order%")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Ачаалж чадсангүй");
    else setOrders((data as OrderRow[]) || []);
    setOrdersLoading(false);
  }, []);

  useEffect(() => { if (tab === "list") void loadOrders(); }, [tab, loadOrders]);

  const filteredOrders = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (listStatus !== "all" && o.status !== listStatus) return false;
      if (!q) return true;
      const itemsText = Array.isArray(o.items) ? o.items.map((it: any) => it.name).join(" ") : "";
      return (
        (o.order_ref || "").toLowerCase().includes(q) ||
        (o.phone || "").toLowerCase().includes(q) ||
        (o.shipping_address || "").toLowerCase().includes(q) ||
        itemsText.toLowerCase().includes(q)
      );
    });
  }, [orders, listSearch, listStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    STATUS_OPTIONS.forEach((s) => (c[s.value] = 0));
    orders.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const updateStatus = async (id: string, status: string) => {
    const prev = orders;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error("Статус солиход алдаа"); setOrders(prev); }
    else toast.success("Статус солигдлоо");
  };

  const confirmOrder = async (o: OrderRow) => {
    if (products.length === 0) { toast.error("Барааны жагсаалт ачаалагдаагүй байна"); return; }
    const rawItems = Array.isArray(o.items) ? o.items : [];
    if (rawItems.length === 0) { toast.error("Бараа хоосон"); return; }
    setConfirming(o.id);
    try {
      const enriched: any[] = [];
      const unmatched: string[] = [];
      for (const it of rawItems) {
        const qty = Math.max(1, parseInt(it.quantity) || 1);
        const existingId = it.product_id;
        let p: ProductLite | null = existingId ? (products.find((x) => x.id === existingId) || null) : null;
        if (!p) p = matchProduct(String(it.name || ""));
        if (p) {
          enriched.push({ product_id: p.id, name: p.name, price: Number(p.price) || 0, quantity: qty });
        } else {
          unmatched.push(String(it.name || ""));
          enriched.push({ product_id: null, name: String(it.name || ""), price: Number(it.price) || 0, quantity: qty });
        }
      }
      const sub = enriched.reduce((s, it) => s + (it.price * it.quantity), 0);
      const fee = sub >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
      const tot = sub + fee;
      const { error } = await supabase
        .from("orders")
        .update({ items: enriched, total: tot, delivery_fee: fee, status: "confirmed" })
        .eq("id", o.id);
      if (error) throw error;
      setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, status: "confirmed", items: enriched, total: tot } : x)));
      if (unmatched.length > 0) toast.warning(`Баталгаажлаа. Тохирохгүй: ${unmatched.join(", ")}`);
      else toast.success(`Баталгаажлаа — ${money(tot)}`);
    } catch (e: any) {
      toast.error(e.message || "Баталгаажуулж чадсангүй");
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Хурдан захиалга</h1>
            <p className="text-[10px] text-muted-foreground">AI ашиглан бичсэн/ярьсанаас захиалга үүсгэ</p>
          </div>
          <Link to="/" className="text-xs text-muted-foreground">Нүүр</Link>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="inline-flex rounded-xl border border-border bg-card p-1">
            <button onClick={() => setTab("new")}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${tab === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Plus className="h-3.5 w-3.5" /> Шинэ
            </button>
            <button onClick={() => setTab("list")}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${tab === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <List className="h-3.5 w-3.5" /> Жагсаалт
              {orders.length > 0 && <span className="ml-1 bg-background/20 rounded-full px-1.5 text-[10px]">{orders.length}</span>}
            </button>
          </div>
        </div>
      </header>

      {tab === "new" ? (
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
              <span>Захиалгын мэдээллийг чөлөөтэй бичих эсвэл ярих</span>
              {text && <button onClick={() => setText("")} className="text-[10px] text-muted-foreground hover:text-destructive">Цэвэрлэх</button>}
            </label>
            <div className="relative mt-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Жишээ: 99112233 Сүхбаатар дүүрэг 3-р хороолол 15-р байр 42 тоот, ногоон цамц 2ш, хар өмд L 1ш"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-14 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={listening ? stopMic : startMic}
                className={`absolute right-2 top-2 h-11 w-11 rounded-full flex items-center justify-center ${
                  listening ? "bg-red-500 text-white animate-pulse" : "bg-primary text-primary-foreground"
                }`}
                aria-label="Микрофон"
                type="button"
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{text.length} тэмдэгт</span>
              {products.length > 0 && <span>{products.length} бараа AI-д илгээгдэнэ</span>}
            </div>
            <button
              onClick={handleParse}
              disabled={loading || !text.trim()}
              className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "AI задалж байна..." : "AI-аар задлах"}
            </button>
          </div>

          {parsed && (
            <div className="bg-card rounded-2xl border-2 border-primary/40 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> AI задарсан үр дүн</h2>
                <div className="flex items-center gap-2 text-[10px]">
                  {matchedCount > 0 && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✓ {matchedCount} тааруулсан</span>}
                  {unmatchedCount > 0 && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">! {unmatchedCount} тодорхойгүй</span>}
                </div>
              </div>

              {parsed.note && (
                <div className="flex items-start gap-1.5 bg-amber-50 text-amber-800 text-[11px] p-2 rounded-lg border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {parsed.note}
                </div>
              )}

              {/* Contact + address */}
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Утас</label>
                  <input
                    value={parsed.phone}
                    onChange={(e) => setParsed({ ...parsed, phone: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                    placeholder="99112233"
                    className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm ${parsed.phone.length === 8 ? "border-border" : "border-destructive/50"}`}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Эх үүсвэр</label>
                  <input
                    value={parsed.source}
                    onChange={(e) => setParsed({ ...parsed, source: e.target.value })}
                    placeholder="Facebook / Утас / ..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-muted-foreground">Хаяг</label>
                  <textarea
                    value={parsed.address}
                    onChange={(e) => setParsed({ ...parsed, address: e.target.value })}
                    rows={2}
                    className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none ${parsed.address ? "border-border" : "border-destructive/50"}`}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-muted-foreground font-bold">БАРАА</label>
                  <button onClick={addItem} className="text-xs text-primary font-bold flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Нэмэх
                  </button>
                </div>
                {parsed.items.map((it, i) => {
                  const matched = !!it.matched_product_id;
                  return (
                    <div key={i} className={`rounded-xl border p-2.5 ${matched ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/40"}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {matched ? (
                              <Package className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            )}
                            <input
                              value={it.name}
                              onChange={(e) => setItem(i, { name: e.target.value })}
                              className="flex-1 bg-transparent text-sm font-medium focus:outline-none min-w-0"
                            />
                          </div>
                          {matched ? (
                            <div className="text-[10px] text-emerald-700 pl-5 truncate">
                              → {it.matched_product_name} • {money(it.price)}
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-700 pl-5">Тохирох бараа олдоогүй — сонгоно уу</div>
                          )}
                        </div>
                        <input
                          type="number" min={1} value={it.quantity}
                          onChange={(e) => setItem(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-14 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center"
                        />
                        <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive p-1.5">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 pl-5">
                        <button
                          onClick={() => { setPickerIdx(i); setPickerQuery(it.name); }}
                          className="text-[11px] text-primary font-bold hover:underline"
                        >
                          {matched ? "Барааг солих" : "Бараа сонгох"}
                        </button>
                        {matched && (
                          <span className="text-xs font-bold">{money(it.price * it.quantity)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {parsed.items.length === 0 && (
                  <p className="text-xs text-destructive text-center py-2">Бараа хоосон</p>
                )}
              </div>

              {/* Totals */}
              {parsed.items.length > 0 && (
                <div className="rounded-xl bg-secondary/50 p-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Барааны дүн</span><span className="font-bold">{money(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Хүргэлт</span><span className="font-bold">{deliveryFee === 0 ? "Үнэгүй" : money(deliveryFee)}</span></div>
                  <div className="flex justify-between pt-1.5 border-t border-border"><span className="font-bold">Нийт</span><span className="font-bold text-primary text-sm">{money(total)}</span></div>
                  {subtotal > 0 && subtotal < FREE_DELIVERY_THRESHOLD && (
                    <p className="text-[10px] text-muted-foreground pt-1">{money(FREE_DELIVERY_THRESHOLD - subtotal)} нэмбэл хүргэлт үнэгүй</p>
                  )}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 text-white py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Захиалга үүсгэх
              </button>
              {unmatchedCount > 0 && (
                <p className="text-[10px] text-center text-amber-700">Тодорхойгүй бараатай хадгалж болно — дараа "Баталгаажуулах" үед автоматаар тааруулна</p>
              )}
            </div>
          )}

          {/* Product picker sheet */}
          {pickerIdx !== null && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setPickerIdx(null)}>
              <div className="bg-card rounded-2xl border border-border w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-3 border-b border-border flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    autoFocus
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Барааны нэрээр хайх"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <button onClick={() => setPickerIdx(null)}><X className="h-4 w-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {pickerResults.length === 0 ? (
                    <p className="p-6 text-center text-xs text-muted-foreground">Илэрц олдсонгүй</p>
                  ) : (
                    pickerResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => chooseProduct(pickerIdx, p)}
                        className="w-full text-left p-3 border-b border-border hover:bg-secondary flex items-center justify-between gap-2"
                      >
                        <span className="text-sm truncate">{p.name}</span>
                        <span className="text-xs font-bold text-primary shrink-0">{money(p.price)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-5 space-y-3">
          {/* Filters */}
          <div className="bg-card rounded-2xl border border-border p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Код / утас / хаяг / бараагаар хайх"
                className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
              {[{ value: "all", label: "Бүгд" }, ...STATUS_OPTIONS].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setListStatus(s.value)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-full whitespace-nowrap ${listStatus === s.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {s.label} {counts[s.value] ? `(${counts[s.value]})` : ""}
                </button>
              ))}
            </div>
          </div>

          {ordersLoading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Уншиж байна...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
              {orders.length === 0 ? "Одоогоор захиалга алга." : "Илэрц олдсонгүй."}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {filteredOrders.map((o) => {
                  const meta = STATUS_META(o.status);
                  return (
                    <div key={o.id} className="bg-card rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div>
                          <p className="font-bold text-sm">{o.order_ref || o.id.slice(0, 8)}</p>
                          <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("mn-MN")}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.color}`}>{meta.label}</span>
                      </div>
                      <p className="text-xs"><span className="text-muted-foreground">Утас:</span> {o.phone}</p>
                      <p className="text-xs mt-0.5"><span className="text-muted-foreground">Хаяг:</span> {o.shipping_address}</p>
                      <p className="text-xs mt-0.5"><span className="text-muted-foreground">Бараа:</span> {Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} × ${it.quantity}`).join(", ") : ""}</p>
                      {!!o.total && <p className="text-xs mt-0.5 font-bold text-primary">{money(o.total)}</p>}
                      <div className="mt-2 flex gap-2">
                        <select
                          value={STATUS_OPTIONS.find((x) => x.value === o.status) ? o.status : "pending"}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        {o.status === "pending" && (
                          <button
                            onClick={() => confirmOrder(o)}
                            disabled={confirming === o.id}
                            className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                          >
                            {confirming === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Батал
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-xs">
                    <tr>
                      <th className="text-left p-3">Огноо</th>
                      <th className="text-left p-3">Код</th>
                      <th className="text-left p-3">Утас</th>
                      <th className="text-left p-3">Хаяг</th>
                      <th className="text-left p-3">Бараа</th>
                      <th className="text-right p-3">Дүн</th>
                      <th className="text-left p-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => {
                      const meta = STATUS_META(o.status);
                      return (
                        <tr key={o.id} className="border-t border-border">
                          <td className="p-3 text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleString("mn-MN")}</td>
                          <td className="p-3 text-xs font-bold">{o.order_ref || o.id.slice(0, 8)}</td>
                          <td className="p-3 text-xs">{o.phone}</td>
                          <td className="p-3 text-xs max-w-[220px] truncate" title={o.shipping_address || ""}>{o.shipping_address}</td>
                          <td className="p-3 text-xs max-w-[240px] truncate">{Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} × ${it.quantity}`).join(", ") : ""}</td>
                          <td className="p-3 text-xs font-bold text-right">{o.total ? money(o.total) : "-"}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.color}`}>{meta.label}</span>
                              <select
                                value={STATUS_OPTIONS.find((x) => x.value === o.status) ? o.status : "pending"}
                                onChange={(e) => updateStatus(o.id, e.target.value)}
                                className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                              >
                                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              {o.status === "pending" && (
                                <button
                                  onClick={() => confirmOrder(o)}
                                  disabled={confirming === o.id}
                                  className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                                >
                                  {confirming === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Батал
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
