import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, MicOff, Send, Check, Pencil, List, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { scoreCandidate } from "@/lib/searchNormalize";

interface ProductLite { id: string; name: string; price: number; original_price: number | null; is_on_sale: boolean | null }

interface ParsedItem { name: string; quantity: number }
interface Parsed {
  phone: string;
  address: string;
  items: ParsedItem[];
  source: string;
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
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Шинэ" },
  { value: "confirmed", label: "Баталгаажсан" },
  { value: "delivering", label: "Хүргэгдэж буй" },
  { value: "delivered", label: "Хүргэгдсэн" },
  { value: "cancelled", label: "Цуцлагдсан" },
];
const STATUS_LABEL = (s: string) => STATUS_OPTIONS.find((x) => x.value === s)?.label ?? s;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function QuickOrderPage() {
  const [tab, setTab] = useState<"new" | "list">("new");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Load products once for auto-matching on confirm.
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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-quick-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI алдаа");
      setParsed(data);
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message || "Алдаа");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    if (!parsed.phone || !parsed.address) { toast.error("Утас болон хаяг заавал"); return; }
    if (parsed.items.length === 0) { toast.error("Бараа хоосон байна"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("create_guest_order", {
        payload: {
          phone: parsed.phone,
          shipping_address: parsed.address,
          items: parsed.items.map((it) => ({
            name: it.name, quantity: it.quantity, price: 0, product_id: null,
          })),
          total: 0,
          status: "pending",
          payment_method: "cash",
          payment_status: "unpaid",
          delivery_fee: 0,
          source_note: parsed.source ? `quick-order:${parsed.source}` : "quick-order",
          guest_name: null,
        } as any,
      });
      if (error) throw error;
      const ref = Array.isArray(data) && data[0]?.order_ref ? data[0].order_ref : "";
      toast.success(`Хадгалагдлаа ${ref}`);
      setText(""); setParsed(null); setEditing(false);
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
      .select("id,order_ref,phone,shipping_address,items,status,source_note,created_at")
      .like("source_note", "quick-order%")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Ачаалж чадсангүй");
    else setOrders((data as OrderRow[]) || []);
    setOrdersLoading(false);
  }, []);

  useEffect(() => { if (tab === "list") void loadOrders(); }, [tab, loadOrders]);

  const updateStatus = async (id: string, status: string) => {
    const prev = orders;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error("Статус солиход алдаа"); setOrders(prev); }
    else toast.success("Статус солигдлоо");
  };

  // Confirm quick-order → match items to real products, fill prices, compute
  // total and delivery fee, then flip status to `confirmed` so it appears as a
  // regular order in the main admin flow.
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
        const p = matchProduct(String(it.name || ""));
        if (p) {
          enriched.push({
            product_id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            quantity: qty,
          });
        } else {
          unmatched.push(String(it.name || ""));
          enriched.push({
            product_id: null,
            name: String(it.name || ""),
            price: Number(it.price) || 0,
            quantity: qty,
          });
        }
      }
      const subtotal = enriched.reduce((s, it) => s + (it.price * it.quantity), 0);
      const deliveryFee = subtotal >= 50000 ? 0 : 8000;
      const total = subtotal + deliveryFee;

      const { error } = await supabase
        .from("orders")
        .update({
          items: enriched,
          total,
          delivery_fee: deliveryFee,
          status: "confirmed",
        })
        .eq("id", o.id);
      if (error) throw error;

      setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, status: "confirmed", items: enriched } : x)));
      if (unmatched.length > 0) {
        toast.warning(`Баталгаажлаа. Тохирохгүй бараа: ${unmatched.join(", ")}`);
      } else {
        toast.success(`Баталгаажлаа — Нийт ${total.toLocaleString("mn-MN")}₮`);
      }
    } catch (e: any) {
      toast.error(e.message || "Баталгаажуулж чадсангүй");
    } finally {
      setConfirming(null);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-base font-bold">Хурдан захиалга</h1>
          <Link to="/" className="text-xs text-muted-foreground">Нүүр</Link>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="inline-flex rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setTab("new")}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${tab === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Plus className="h-3.5 w-3.5" /> Шинэ
            </button>
            <button
              onClick={() => setTab("list")}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${tab === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> Жагсаалт
            </button>
          </div>
        </div>
      </header>

      {tab === "new" ? (
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <label className="text-xs font-bold text-muted-foreground">Захиалгын мэдээллийг чөлөөтэй бичих эсвэл ярих</label>
            <div className="relative mt-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Жишээ: 99112233 Сүхбаатар дүүрэг 3-р хороолол 15-р байр 42 тоот, ногоон цамц 2ш, хар өмд 1ш"
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
            <button
              onClick={handleParse}
              disabled={loading || !text.trim()}
              className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "AI задалж байна..." : "AI-аар задлах"}
            </button>
          </div>

          {parsed && (
            <div className="bg-card rounded-2xl border-2 border-primary/40 p-4 space-y-3">
              <h2 className="text-sm font-bold">Задарсан үр дүн</h2>
              {editing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Утас</label>
                    <input value={parsed.phone} onChange={(e) => setParsed({ ...parsed, phone: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Хаяг</label>
                    <textarea value={parsed.address} onChange={(e) => setParsed({ ...parsed, address: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] text-muted-foreground">Бараа</label>
                    {parsed.items.map((it, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={it.name}
                          onChange={(e) => {
                            const items = [...parsed.items]; items[i] = { ...it, name: e.target.value };
                            setParsed({ ...parsed, items });
                          }}
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                        <input type="number" min={1} value={it.quantity}
                          onChange={(e) => {
                            const items = [...parsed.items];
                            items[i] = { ...it, quantity: Math.max(1, parseInt(e.target.value) || 1) };
                            setParsed({ ...parsed, items });
                          }}
                          className="w-20 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                        <button onClick={() => setParsed({ ...parsed, items: parsed.items.filter((_, j) => j !== i) })}
                          className="text-muted-foreground hover:text-destructive p-2">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setParsed({ ...parsed, items: [...parsed.items, { name: "", quantity: 1 }] })}
                      className="text-xs text-primary font-bold flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Бараа нэмэх
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-1.5 text-sm">
                  <div className="flex gap-2"><dt className="text-muted-foreground w-16 shrink-0">Утас:</dt><dd className="font-medium">{parsed.phone || <span className="text-destructive">хоосон</span>}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-16 shrink-0">Хаяг:</dt><dd className="font-medium">{parsed.address || <span className="text-destructive">хоосон</span>}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted-foreground w-16 shrink-0">Бараа:</dt>
                    <dd className="font-medium">
                      {parsed.items.length === 0 ? <span className="text-destructive">хоосон</span> :
                        <ul className="list-disc pl-4 space-y-0.5">
                          {parsed.items.map((it, i) => <li key={i}>{it.name} × {it.quantity}</li>)}
                        </ul>}
                    </dd>
                  </div>
                  {parsed.source && <div className="flex gap-2"><dt className="text-muted-foreground w-16 shrink-0">Эх үүсвэр:</dt><dd className="font-medium">{parsed.source}</dd></div>}
                </dl>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="rounded-xl border border-border py-3 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Pencil className="h-4 w-4" /> {editing ? "Дуусгах" : "Засах"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 text-white py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Зөв, хадгалах
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-5">
          {ordersLoading ? (
            <p className="text-xs text-muted-foreground">Уншиж байна...</p>
          ) : orders.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
              Одоогоор захиалга алга.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {orders.map((o) => (
                  <div key={o.id} className="bg-card rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="font-bold text-sm">{o.order_ref || o.id.slice(0, 8)}</p>
                      <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("mn-MN")}</span>
                    </div>
                    <p className="text-xs"><span className="text-muted-foreground">Утас:</span> {o.phone}</p>
                    <p className="text-xs mt-0.5"><span className="text-muted-foreground">Хаяг:</span> {o.shipping_address}</p>
                    <p className="text-xs mt-0.5"><span className="text-muted-foreground">Бараа:</span> {Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} × ${it.quantity}`).join(", ") : ""}</p>
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
                          {confirming === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Баталгаажуулах
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
                      <th className="text-left p-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t border-border">
                        <td className="p-3 text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleString("mn-MN")}</td>
                        <td className="p-3 text-xs font-bold">{o.order_ref || o.id.slice(0, 8)}</td>
                        <td className="p-3 text-xs">{o.phone}</td>
                        <td className="p-3 text-xs">{o.shipping_address}</td>
                        <td className="p-3 text-xs">{Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} × ${it.quantity}`).join(", ") : ""}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={STATUS_OPTIONS.find((x) => x.value === o.status) ? o.status : "pending"}
                              onChange={(e) => updateStatus(o.id, e.target.value)}
                              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                            >
                              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            {o.status === "pending" && (
                              <button
                                onClick={() => updateStatus(o.id, "confirmed")}
                                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Баталгаажуулах
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
