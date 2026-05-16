/**
 * Admin Tracking Dashboard
 * - Live visitors (сүүлийн 5 мин)
 * - Hot leads (score >= 60)
 * - Recent activity feed (realtime)
 * - Funnel & KPI
 * - Abandoned recovery list (cart 1 цаг, invoice 30 мин)
 * - Manual recovery actions (Messenger / SMS / Call / Mark recovered)
 */
import { useEffect, useMemo, useState } from "react";
import { usePersistedState, dateSerialize, dateDeserialize } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Flame, Activity, TrendingUp, ShoppingCart, Phone,
  MessageCircle, CheckCircle2, X, Smartphone, Monitor, Tablet, RefreshCw,
  Eye, PackagePlus, CreditCard, BadgeCheck, CalendarIcon
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  LineChart, Line, CartesianGrid
} from "recharts";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Session = {
  id: string; session_token: string; user_id: string | null;
  device: string | null; referrer: string | null; landing_path: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  is_returning: boolean; started_at: string; last_seen_at: string;
};
type Event = {
  id: string; session_id: string | null; user_id: string | null;
  event_type: string; product_id: string | null; category: string | null;
  value: number | null; page_path: string | null; metadata: Record<string, unknown> | null;
  created_at: string;
};
type Lead = {
  id: string; session_id: string | null; user_id: string | null;
  phone: string | null; name: string | null; score: number; status: string;
  last_activity: string; last_event_type: string | null; last_product_id: string | null;
};
type Recovery = {
  id: string; session_id: string | null; user_id: string | null;
  phone: string | null; name: string | null;
  type: string; status: string; channel: string | null; note: string | null;
  contacted_at: string | null; recovered_at: string | null; created_at: string;
};

const LIVE_WINDOW_MS = 5 * 60 * 1000;
const CART_ABANDON_MS = 60 * 60 * 1000;
const INVOICE_ABANDON_MS = 30 * 60 * 1000;

const EVENT_LABELS: Record<string, string> = {
  page_view: "Хуудас үзсэн",
  product_view: "Бараа үзсэн",
  category_view: "Ангилал үзсэн",
  add_to_cart: "Сагсанд нэмсэн",
  remove_from_cart: "Сагснаас хассан",
  checkout_start: "Захиалга эхэлсэн",
  invoice_create: "Нэхэмжлэх үүсгэсэн",
  purchase: "Худалдан авалт",
  search: "Хайлт",
  banner_click: "Баннер дарсан",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} сек`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ц`;
  return `${Math.floor(h / 24)} өдөр`;
}

function statusColor(status: string): string {
  if (status === "hot") return "bg-red-500/15 text-red-600 border-red-500/30";
  if (status === "warm") return "bg-orange-500/15 text-orange-600 border-orange-500/30";
  return "bg-blue-500/15 text-blue-600 border-blue-500/30";
}

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (device === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

export default function TrackingDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [recovery, setRecovery] = useState<Recovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = usePersistedState<"overview" | "live" | "leads" | "recovery" | "feed">("admin.tracking.view", "overview");
  const [tick, setTick] = useState(0);
  const [funnelRange, setFunnelRange] = usePersistedState<"today" | "7d" | "30d" | "custom">("admin.tracking.range", "today");
  const [customFrom, setCustomFrom] = usePersistedState<Date | undefined>(
    "admin.tracking.from",
    () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 14); return d; },
    { serialize: dateSerialize, deserialize: dateDeserialize }
  );
  const [customTo, setCustomTo] = usePersistedState<Date | undefined>(
    "admin.tracking.to",
    () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; },
    { serialize: dateSerialize, deserialize: dateDeserialize }
  );

  // Resolve the active range to concrete from/to dates
  const range = useMemo(() => {
    const now = new Date();
    if (funnelRange === "today") {
      const f = new Date(); f.setHours(0, 0, 0, 0);
      return { from: f, to: now, days: 1 };
    }
    if (funnelRange === "7d" || funnelRange === "30d") {
      const days = funnelRange === "7d" ? 7 : 30;
      const f = new Date(); f.setHours(0, 0, 0, 0); f.setDate(f.getDate() - (days - 1));
      return { from: f, to: now, days };
    }
    const f = customFrom ?? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 6); return d; })();
    const t = customTo ?? now;
    const days = Math.max(1, Math.ceil((t.getTime() - f.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    return { from: f, to: t, days };
  }, [funnelRange, customFrom, customTo]);

  const refresh = async (sinceOverride?: string) => {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fetchSince = sinceOverride
      ? sinceOverride
      : (funnelRange === "custom" && range.from < since30 ? range.from.toISOString() : since30.toISOString());
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [s, e, l, r] = await Promise.all([
      supabase.from("analytics_sessions").select("*").gte("last_seen_at", fetchSince).order("last_seen_at", { ascending: false }).limit(2000),
      supabase.from("analytics_events").select("*").gte("created_at", fetchSince).order("created_at", { ascending: false }).limit(10000),
      supabase.from("lead_scores").select("*").order("score", { ascending: false }).limit(200),
      supabase.from("recovery_actions").select("*").gte("created_at", since24).order("created_at", { ascending: false }).limit(100),
    ]);
    setSessions((s.data as Session[]) || []);
    setEvents((e.data as Event[]) || []);
    setLeads((l.data as Lead[]) || []);
    setRecovery((r.data as Recovery[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("admin-tracking")
      .on("postgres_changes", { event: "*", schema: "public", table: "analytics_events" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "analytics_sessions" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_scores" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "recovery_actions" }, () => refresh())
      .subscribe();
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when custom range needs older data than already loaded
  useEffect(() => {
    if (funnelRange === "custom" && range.from < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      refresh(range.from.toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelRange, customFrom]);

  // Live = last 5 min
  const liveSessions = useMemo(() => {
    const cutoff = Date.now() - LIVE_WINDOW_MS;
    return sessions.filter((s) => new Date(s.last_seen_at).getTime() >= cutoff);
  }, [sessions, tick]);

  // KPI: today
  const kpi = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEvents = events.filter((e) => new Date(e.created_at) >= todayStart);
    const sessionIdsToday = new Set(events.filter((e) => new Date(e.created_at) >= todayStart).map((e) => e.session_id));
    const productViews = todayEvents.filter((e) => e.event_type === "product_view").length;
    const addToCart = todayEvents.filter((e) => e.event_type === "add_to_cart").length;
    const checkout = todayEvents.filter((e) => e.event_type === "checkout_start").length;
    const purchase = todayEvents.filter((e) => e.event_type === "purchase").length;
    const conv = sessionIdsToday.size ? ((purchase / sessionIdsToday.size) * 100).toFixed(1) : "0";
    return { sessions: sessionIdsToday.size, productViews, addToCart, checkout, purchase, conv };
  }, [events, tick]);

  // Hot leads
  const hotLeads = useMemo(() => leads.filter((l) => l.status === "hot").slice(0, 50), [leads]);
  const warmLeads = useMemo(() => leads.filter((l) => l.status === "warm").slice(0, 50), [leads]);

  // Funnel by selected range
  const funnel = useMemo(() => {
    const inRange = events.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t >= range.from.getTime() && t <= range.to.getTime();
    });
    const uniq = (type: string) => new Set(inRange.filter((e) => e.event_type === type).map((e) => e.session_id || e.id)).size;
    const productView = uniq("product_view");
    const addToCart = uniq("add_to_cart");
    const checkoutStart = uniq("checkout_start");
    const purchase = uniq("purchase");
    const steps = [
      { key: "product_view", label: "Бараа үзсэн", value: productView, icon: "eye", color: "hsl(217 91% 60%)" },
      { key: "add_to_cart", label: "Сагсанд нэмсэн", value: addToCart, icon: "cart", color: "hsl(38 92% 50%)" },
      { key: "checkout_start", label: "Захиалга эхэлсэн", value: checkoutStart, icon: "card", color: "hsl(280 65% 60%)" },
      { key: "purchase", label: "Худалдан авсан", value: purchase, icon: "check", color: "hsl(142 71% 45%)" },
    ];
    const top = steps[0].value || 1;
    const enriched = steps.map((s, i) => ({
      ...s,
      pctTop: Math.round((s.value / top) * 100),
      drop: i > 0 && steps[i - 1].value > 0 ? Math.round((1 - s.value / steps[i - 1].value) * 100) : 0,
      stepConv: i > 0 && steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : 100,
    }));
    const overallConv = productView > 0 ? ((purchase / productView) * 100).toFixed(1) : "0";
    return { steps: enriched, overallConv };
  }, [events, range, tick]);

  // Daily trend across the selected range
  const trend = useMemo(() => {
    const buckets: Record<string, { date: string; product_view: number; add_to_cart: number; checkout_start: number; purchase: number }> = {};
    const start = new Date(range.from); start.setHours(0, 0, 0, 0);
    const end = new Date(range.to); end.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      buckets[k] = { date: k.slice(5), product_view: 0, add_to_cart: 0, checkout_start: 0, purchase: 0 };
    }
    for (const e of events) {
      const k = e.created_at.slice(0, 10);
      const b = buckets[k];
      if (!b) continue;
      if (e.event_type === "product_view") b.product_view += 1;
      else if (e.event_type === "add_to_cart") b.add_to_cart += 1;
      else if (e.event_type === "checkout_start") b.checkout_start += 1;
      else if (e.event_type === "purchase") b.purchase += 1;
    }
    return Object.values(buckets);
  }, [events, range]);

  // Abandoned detection
  const abandoned = useMemo(() => {
    const now = Date.now();
    const sessionLastEvent = new Map<string, Event>();
    for (const ev of events) {
      const sid = ev.session_id || "";
      if (!sessionLastEvent.has(sid)) sessionLastEvent.set(sid, ev);
    }
    const eventsBySession = new Map<string, Event[]>();
    for (const ev of events) {
      const sid = ev.session_id || "";
      if (!eventsBySession.has(sid)) eventsBySession.set(sid, []);
      eventsBySession.get(sid)!.push(ev);
    }
    const result: Array<{ session: Session; type: "cart_abandoned" | "invoice_abandoned"; lastEvent: Event }> = [];
    for (const sess of sessions) {
      const evs = eventsBySession.get(sess.id) || [];
      const hasPurchase = evs.some((e) => e.event_type === "purchase");
      if (hasPurchase) continue;
      const invoice = evs.find((e) => e.event_type === "invoice_create");
      const checkout = evs.find((e) => e.event_type === "checkout_start");
      const cart = evs.find((e) => e.event_type === "add_to_cart");
      if (invoice && now - new Date(invoice.created_at).getTime() >= INVOICE_ABANDON_MS) {
        result.push({ session: sess, type: "invoice_abandoned", lastEvent: invoice });
      } else if ((cart || checkout) && cart && now - new Date(cart.created_at).getTime() >= CART_ABANDON_MS) {
        result.push({ session: sess, type: "cart_abandoned", lastEvent: cart });
      }
    }
    return result.sort((a, b) => new Date(b.lastEvent.created_at).getTime() - new Date(a.lastEvent.created_at).getTime());
  }, [events, sessions, tick]);

  // Top viewed products today
  const topProducts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== "product_view" || !e.product_id) continue;
      counts.set(e.product_id, (counts.get(e.product_id) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events]);

  // Traffic sources
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const key = s.utm_source || (s.referrer ? new URL(s.referrer.startsWith("http") ? s.referrer : `https://${s.referrer}`).hostname.replace("www.", "") : "Direct");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [sessions]);

  // Device split
  const devices = useMemo(() => {
    const counts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    for (const s of sessions) counts[s.device || "desktop"] = (counts[s.device || "desktop"] || 0) + 1;
    return counts;
  }, [sessions]);

  async function createRecovery(sess: Session, type: "cart_abandoned" | "invoice_abandoned", channel: string) {
    const lead = leads.find((l) => l.session_id === sess.id);
    await supabase.from("recovery_actions").insert({
      session_id: sess.id,
      user_id: sess.user_id ?? undefined,
      phone: lead?.phone ?? undefined,
      name: lead?.name ?? undefined,
      type, channel, status: "contacted",
      contacted_at: new Date().toISOString(),
    });
    refresh();
  }

  async function updateRecovery(id: string, patch: Partial<Recovery>) {
    await supabase.from("recovery_actions").update(patch).eq("id", id);
    refresh();
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Ачааллаж байна…</div>;
  }

  return (
    <div className="space-y-5">
      {/* Sub-nav */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { id: "overview", label: "Тойм", icon: TrendingUp },
          { id: "live", label: "Live зочид", icon: Activity, count: liveSessions.length },
          { id: "leads", label: "Hot leads", icon: Flame, count: hotLeads.length },
          { id: "recovery", label: "Сэргээх", icon: ShoppingCart, count: abandoned.length },
          { id: "feed", label: "Идэвх", icon: Activity },
        ] as const).map((v) => {
          const Icon = v.icon;
          const active = activeView === v.id;
          return (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}>
              <Icon className="h-4 w-4" />{v.label}
              {"count" in v && v.count !== undefined && v.count > 0 && (
                <span className={`text-[10px] min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full px-1 ${active ? "bg-primary-foreground/20" : "bg-background"}`}>{v.count}</span>
              )}
            </button>
          );
        })}
        <button onClick={() => refresh()} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-secondary hover:bg-secondary/80">
          <RefreshCw className="h-3.5 w-3.5" />Шинэчлэх
        </button>
      </div>

      {activeView === "overview" && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPI label="Live зочид" value={liveSessions.length} icon={<span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />} accent="emerald" />
            <KPI label="Өнөөдөр session" value={kpi.sessions} />
            <KPI label="Бараа үзсэн" value={kpi.productViews} />
            <KPI label="Сагсанд" value={kpi.addToCart} />
            <KPI label="Захиалга" value={kpi.purchase} />
            <KPI label="Conv. %" value={`${kpi.conv}%`} />
          </div>

          {/* Funnel: product_view → add_to_cart → checkout_start → purchase */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold">Борлуулалтын Funnel</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(range.from, "yyyy.MM.dd")} – {format(range.to, "yyyy.MM.dd")} · Нийт хөрвүүлэлт:{" "}
                  <span className="font-bold text-foreground">{funnel.overallConv}%</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-lg bg-secondary p-0.5 text-xs">
                  {([
                    { id: "today", label: "Өнөөдөр" },
                    { id: "7d", label: "7 хоног" },
                    { id: "30d", label: "30 хоног" },
                    { id: "custom", label: "Хувийн" },
                  ] as const).map((r) => (
                    <button key={r.id} onClick={() => setFunnelRange(r.id)}
                      className={`px-3 py-1.5 rounded-md font-medium transition ${
                        funnelRange === r.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}>{r.label}</button>
                  ))}
                </div>
                {funnelRange === "custom" && (
                  <div className="flex items-center gap-1.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border bg-background hover:bg-secondary",
                          !customFrom && "text-muted-foreground"
                        )}>
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {customFrom ? format(customFrom, "yyyy.MM.dd") : "Эхлэх"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom}
                          disabled={(d) => d > new Date() || (customTo ? d > customTo : false)}
                          initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                    <span className="text-xs text-muted-foreground">—</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border bg-background hover:bg-secondary",
                          !customTo && "text-muted-foreground"
                        )}>
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {customTo ? format(customTo, "yyyy.MM.dd") : "Дуусах"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={customTo}
                          onSelect={(d) => { if (d) { const x = new Date(d); x.setHours(23, 59, 59, 999); setCustomTo(x); } }}
                          disabled={(d) => d > new Date() || (customFrom ? d < customFrom : false)}
                          initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>

            {/* Step KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {funnel.steps.map((s, i) => {
                const Icon = s.icon === "eye" ? Eye : s.icon === "cart" ? PackagePlus : s.icon === "card" ? CreditCard : BadgeCheck;
                return (
                  <div key={s.key} className="rounded-xl p-3 border border-border bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <Icon className="h-4 w-4" style={{ color: s.color }} />
                      <span className="text-[10px] font-bold text-muted-foreground">{i + 1}/4</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-2">{s.label}</div>
                    <div className="text-2xl font-bold mt-0.5">{s.value.toLocaleString()}</div>
                    <div className="text-[10px] mt-1">
                      {i === 0 ? (
                        <span className="text-muted-foreground">эхлэл</span>
                      ) : (
                        <>
                          <span className="text-emerald-600 font-medium">{s.stepConv}% үлдсэн</span>
                          {s.drop > 0 && <span className="text-red-500 ml-1.5">−{s.drop}%</span>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Horizontal funnel bar chart */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel.steps} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis type="category" dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--secondary))" }}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, _n, p: { payload?: { pctTop: number } }) =>
                      [`${v.toLocaleString()} (${p.payload?.pctTop ?? 0}%)`, "Session"]
                    }
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {funnel.steps.map((s) => <Cell key={s.key} fill={s.color} />)}
                    <LabelList dataKey="value" position="right" fontSize={11} fill="hsl(var(--foreground))" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Step-by-step table */}
            <div className="pt-2 border-t border-border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left font-medium py-2 px-2">Алхам</th>
                    <th className="text-right font-medium py-2 px-2">Тоо</th>
                    <th className="text-right font-medium py-2 px-2">% эхнээс</th>
                    <th className="text-right font-medium py-2 px-2">Өмнөхөөс</th>
                    <th className="text-right font-medium py-2 px-2">Алдагдал</th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.steps.map((s, i) => {
                    const prev = i > 0 ? funnel.steps[i - 1].value : s.value;
                    const lost = i > 0 ? prev - s.value : 0;
                    return (
                      <tr key={s.key} className="border-b border-border/50 last:border-0">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                            <span className="font-medium">{i + 1}. {s.label}</span>
                          </div>
                        </td>
                        <td className="text-right font-bold py-2 px-2">{s.value.toLocaleString()}</td>
                        <td className="text-right py-2 px-2">{s.pctTop}%</td>
                        <td className="text-right py-2 px-2">
                          {i === 0 ? <span className="text-muted-foreground">—</span> : (
                            <span className="text-emerald-600 font-medium">{s.stepConv}%</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-2">
                          {i === 0 ? <span className="text-muted-foreground">—</span> : (
                            <span className="text-red-500">−{lost.toLocaleString()} ({s.drop}%)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-secondary/40 font-bold">
                    <td className="py-2 px-2">Нийт хөрвүүлэлт</td>
                    <td colSpan={4} className="text-right py-2 px-2 text-primary">{funnel.overallConv}% (үзсэн → авсан)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Daily trend */}
            {range.days > 1 && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs font-medium text-muted-foreground mb-2">Өдрийн чиг хандлага</div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="product_view" name="Үзсэн" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="add_to_cart" name="Сагс" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="checkout_start" name="Захиалга" stroke="hsl(280 65% 60%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="purchase" name="Худалдсан" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Топ үзсэн бараа">
              {topProducts.length === 0 ? <Empty>Өгөгдөл байхгүй</Empty> : (
                <ul className="space-y-2">
                  {topProducts.map(([pid, n], i) => (
                    <li key={pid} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                      <span className="flex-1 mx-2 truncate">{pid.slice(0, 8)}…</span>
                      <span className="font-bold">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Урсгалын эх үүсвэр">
              {sources.length === 0 ? <Empty>Өгөгдөл байхгүй</Empty> : (
                <ul className="space-y-2">
                  {sources.map(([src, n]) => {
                    const max = sources[0][1];
                    return (
                      <li key={src} className="space-y-1">
                        <div className="flex justify-between text-sm"><span>{src}</span><span className="font-bold">{n}</span></div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
            <Card title="Төхөөрөмж">
              <div className="grid grid-cols-3 gap-2 text-center">
                {(["mobile", "desktop", "tablet"] as const).map((d) => (
                  <div key={d} className="bg-secondary rounded-xl p-3">
                    <div className="flex justify-center mb-1"><DeviceIcon device={d} /></div>
                    <div className="text-lg font-bold">{devices[d] || 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{d}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Hot leads (топ 5)">
              {hotLeads.length === 0 ? <Empty>Hot lead алга</Empty> : (
                <ul className="space-y-2">
                  {hotLeads.slice(0, 5).map((l) => (
                    <li key={l.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                        <span className="truncate">{l.name || l.phone || `${sessions.find(s=>s.id===l.session_id)?.session_token.slice(0,6)}…`}</span>
                      </div>
                      <span className="font-bold text-red-600">{l.score}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {activeView === "live" && (
        <Card title={`Live зочид · сүүлийн 5 мин (${liveSessions.length})`}>
          {liveSessions.length === 0 ? <Empty>Одоогоор зочин алга</Empty> : (
            <div className="space-y-2">
              {liveSessions.map((s) => {
                const lead = leads.find((l) => l.session_id === s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary transition">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <DeviceIcon device={s.device} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{lead?.name || lead?.phone || `Зочин #${s.session_token.slice(0, 6)}`}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.landing_path || "/"} · {s.utm_source || (s.referrer ? "Referral" : "Direct")} · {s.is_returning ? "Буцаж ирсэн" : "Шинэ"}
                      </div>
                    </div>
                    {lead && (
                      <span className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase ${statusColor(lead.status)}`}>
                        {lead.status} · {lead.score}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(s.last_seen_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeView === "leads" && (
        <>
          <Card title={`Hot leads (${hotLeads.length})`}>
            <LeadList items={hotLeads} sessions={sessions} />
          </Card>
          <Card title={`Warm leads (${warmLeads.length})`}>
            <LeadList items={warmLeads} sessions={sessions} />
          </Card>
        </>
      )}

      {activeView === "recovery" && (
        <>
          <Card title={`Орхисон сагс/нэхэмжлэх (${abandoned.length})`}>
            {abandoned.length === 0 ? <Empty>Сэргээх шаардлагатай session алга</Empty> : (
              <div className="space-y-2">
                {abandoned.map(({ session, type, lastEvent }) => {
                  const lead = leads.find((l) => l.session_id === session.id);
                  return (
                    <div key={session.id} className="p-3 rounded-xl bg-secondary/40 border border-border space-y-2">
                      <div className="flex items-start gap-3 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${type === "invoice_abandoned" ? "bg-red-500/15 text-red-600" : "bg-orange-500/15 text-orange-600"}`}>
                          {type === "invoice_abandoned" ? "НЭХЭМЖЛЭХ" : "САГС"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{lead?.name || lead?.phone || `Зочин #${session.session_token.slice(0, 6)}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {timeAgo(lastEvent.created_at)} өмнө · {session.utm_source || "Direct"} · score {lead?.score ?? 0}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lead?.phone && (
                          <a href={`tel:${lead.phone}`} onClick={() => createRecovery(session, type, "call")}
                             className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 text-xs font-medium hover:bg-emerald-500/25">
                            <Phone className="h-3.5 w-3.5" />Залгах
                          </a>
                        )}
                        <button onClick={() => createRecovery(session, type, "messenger")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-700 text-xs font-medium hover:bg-blue-500/25">
                          <MessageCircle className="h-3.5 w-3.5" />Messenger
                        </button>
                        {lead?.phone && (
                          <a href={`sms:${lead.phone}`} onClick={() => createRecovery(session, type, "sms")}
                             className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-700 text-xs font-medium hover:bg-purple-500/25">
                            SMS
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title={`Сэргээх үйлдэлийн түүх (${recovery.length})`}>
            {recovery.length === 0 ? <Empty>Бүртгэл алга</Empty> : (
              <div className="space-y-2">
                {recovery.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      r.status === "recovered" ? "bg-emerald-500/15 text-emerald-700" :
                      r.status === "dismissed" ? "bg-muted text-muted-foreground" :
                      "bg-blue-500/15 text-blue-700"
                    }`}>{r.status.toUpperCase()}</span>
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="truncate">{r.name || r.phone || "—"} · {r.channel} · {r.type === "invoice_abandoned" ? "Нэхэмжлэх" : "Сагс"}</div>
                      <div className="text-xs text-muted-foreground">{timeAgo(r.created_at)} өмнө</div>
                    </div>
                    {r.status !== "recovered" && (
                      <button onClick={() => updateRecovery(r.id, { status: "recovered", recovered_at: new Date().toISOString() })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />Сэргээгдсэн
                      </button>
                    )}
                    {r.status === "contacted" && (
                      <button onClick={() => updateRecovery(r.id, { status: "dismissed" })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs">
                        <X className="h-3.5 w-3.5" />Хаах
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {activeView === "feed" && (
        <Card title="Realtime идэвхийн урсгал">
          {events.length === 0 ? <Empty>Идэвх алга</Empty> : (
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
              {events.slice(0, 100).map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 text-sm">
                  <span className="text-[10px] text-muted-foreground w-14 shrink-0">{timeAgo(e.created_at)}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary font-medium">{EVENT_LABELS[e.event_type] || e.event_type}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {e.product_id ? `Бараа ${e.product_id.slice(0, 8)}` : e.page_path || ""}
                    {e.value ? ` · ${e.value.toLocaleString()}₮` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function KPI({ label, value, icon, accent }: { label: string; value: number | string; icon?: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide">
        {icon}{label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${accent === "emerald" ? "text-emerald-600" : ""}`}>{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h3 className="text-sm font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground py-4 text-center">{children}</div>;
}


function LeadList({ items, sessions }: { items: Lead[]; sessions: Session[] }) {
  if (items.length === 0) return <Empty>Лид алга</Empty>;
  return (
    <div className="space-y-2">
      {items.map((l) => {
        const sess = sessions.find((s) => s.id === l.session_id);
        return (
          <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
            <span className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase ${statusColor(l.status)}`}>
              {l.score}
            </span>
            <DeviceIcon device={sess?.device || null} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{l.name || l.phone || `Зочин #${sessions.find(s=>s.id===l.session_id)?.session_token.slice(0,6)}`}</div>
              <div className="text-xs text-muted-foreground truncate">
                Сүүлийнх: {EVENT_LABELS[l.last_event_type || ""] || l.last_event_type || "—"} · {timeAgo(l.last_activity)}
              </div>
            </div>
            {l.phone && (
              <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 text-xs">
                <Phone className="h-3.5 w-3.5" />{l.phone}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
