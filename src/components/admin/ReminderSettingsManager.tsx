import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, Send } from "lucide-react";

interface Cfg {
  cart_enabled: boolean;
  cart_delay_hours: number;
  reorder_enabled: boolean;
  sms_sender: string;
  order_link_base: string;
  sms_provider: string;
  cart_message_template: string;
  reorder_message_template: string;
}

const DEFAULTS: Cfg = {
  cart_enabled: true,
  cart_delay_hours: 2,
  reorder_enabled: true,
  sms_sender: "easyshop",
  order_link_base: "https://easyshop.mn/cart",
  sms_provider: "none",
  cart_message_template: "Таны сагсанд {product} хүлээж байна. Захиалгаа дуусгана уу: {link}",
  reorder_message_template: "Таны {product} дуусах цаг боллоо. Дахин захиалах уу? {link}",
};

export default function ReminderSettingsManager() {
  const [cfg, setCfg] = useState<Cfg>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<null | "cart" | "reorder">(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [cfgRes, logsRes] = await Promise.all([
        supabase.from("reminder_config" as any).select("*").eq("id", 1).maybeSingle(),
        supabase.from("reminder_log" as any).select("kind,status,phone,message,created_at,provider").order("created_at", { ascending: false }).limit(20),
      ]);
      if (cfgRes.data) setCfg(cfgRes.data as any);
      if (logsRes.data) setLogs(logsRes.data);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("reminder_config" as any).upsert({ id: 1, ...cfg }, { onConflict: "id" });
    setSaving(false);
    error ? toast.error("Хадгалахад алдаа: " + error.message) : toast.success("Тохиргоо хадгалагдлаа ✓");
  };

  const runScan = async (kind: "cart" | "reorder") => {
    setTesting(kind);
    const fn = kind === "cart" ? "scan-cart-reminders" : "scan-reorder-reminders";
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    setTesting(null);
    if (error) return toast.error("Алдаа: " + error.message);
    toast.success(`Скан амжилттай: ${JSON.stringify(data)}`);
    const { data: fresh } = await supabase.from("reminder_log" as any).select("kind,status,phone,message,created_at,provider").order("created_at", { ascending: false }).limit(20);
    if (fresh) setLogs(fresh);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl space-y-6 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10"><Bell className="h-5 w-5 text-primary" /></div>
        <div>
          <h2 className="text-xl font-semibold">Санамжийн SMS</h2>
          <p className="text-sm text-muted-foreground mt-1">Сагс орхисон болон дахин захиалгын автомат SMS сануулга.</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
        ⚠️ SMS илгээхийн тулд GDPR/PDPR-ийн дагуу хэрэглэгчийн <b>зөвшөөрөл</b> шаардлагатай. Профайл хуудасны "SMS сануулга авах" toggle-г идэвхжүүлсэн хэрэглэгчид л мессеж очно.
      </div>

      {/* Cart reminder */}
      <section className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">1. Сагс орхисон сануулга</h3>
            <p className="text-xs text-muted-foreground">Бараа сагсанд удаан хэвтвэл SMS илгээнэ.</p>
          </div>
          <Switch checked={cfg.cart_enabled} onCheckedChange={(v) => setCfg({ ...cfg, cart_enabled: v })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="delay">Хугацаа (цаг)</Label>
            <Input id="delay" type="number" min="0.5" step="0.5"
              value={cfg.cart_delay_hours}
              onChange={(e) => setCfg({ ...cfg, cart_delay_hours: Number(e.target.value) || 2 })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctpl">Мессежний загвар</Label>
            <Textarea id="ctpl" rows={2} value={cfg.cart_message_template}
              onChange={(e) => setCfg({ ...cfg, cart_message_template: e.target.value })} />
            <p className="text-[11px] text-muted-foreground">{`{product} = барааны нэр, {link} = сагсны линк`}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={testing === "cart"} onClick={() => runScan("cart")}>
          {testing === "cart" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Одоо скан ажиллуулах
        </Button>
      </section>

      {/* Reorder reminder */}
      <section className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">2. Дахин захиалгын сануулга</h3>
            <p className="text-xs text-muted-foreground">Барааны "average_reorder_days" талбарт заасан хоног өнгөрөхөд SMS.</p>
          </div>
          <Switch checked={cfg.reorder_enabled} onCheckedChange={(v) => setCfg({ ...cfg, reorder_enabled: v })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rtpl">Мессежний загвар</Label>
          <Textarea id="rtpl" rows={2} value={cfg.reorder_message_template}
            onChange={(e) => setCfg({ ...cfg, reorder_message_template: e.target.value })} />
        </div>
        <Button variant="outline" size="sm" disabled={testing === "reorder"} onClick={() => runScan("reorder")}>
          {testing === "reorder" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Одоо скан ажиллуулах
        </Button>
      </section>

      {/* Provider config */}
      <section className="rounded-xl border border-border p-4 space-y-4">
        <h3 className="font-semibold text-sm">SMS илгээгч</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Провайдер</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={cfg.sms_provider}
              onChange={(e) => setCfg({ ...cfg, sms_provider: e.target.value })}>
              <option value="none">Байхгүй (зөвхөн лог)</option>
              <option value="twilio">Twilio (глобал ~200₮/SMS)</option>
              <option value="gatewayapi">GatewayAPI (~150₮/SMS)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">"Байхгүй" үед мессежүүд log-нд бичигдэнэ, SMS явахгүй.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Илгээгчийн нэр</Label>
            <Input value={cfg.sms_sender} onChange={(e) => setCfg({ ...cfg, sms_sender: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Захиалгын үндсэн линк</Label>
            <Input value={cfg.order_link_base} onChange={(e) => setCfg({ ...cfg, order_link_base: e.target.value })} />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Хадгалах
        </Button>
      </div>

      {/* Recent log */}
      <section className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Сүүлийн 20 сануулга</h3>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Одоогоор түүх алга.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {logs.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    l.status === "sent" ? "bg-green-500/15 text-green-600" :
                    l.status === "failed" ? "bg-red-500/15 text-red-600" :
                    l.status === "skipped" ? "bg-muted text-muted-foreground" :
                    "bg-amber-500/15 text-amber-600"
                  }`}>{l.status}</span>
                  <span className="text-muted-foreground">{l.kind}</span>
                  <span className="truncate">{l.phone || "—"}</span>
                  <span className="truncate opacity-70">{l.message}</span>
                </div>
                <span className="text-muted-foreground shrink-0">{new Date(l.created_at).toLocaleString("mn-MN")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
