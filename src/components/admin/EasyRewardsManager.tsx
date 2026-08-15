import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Gem, Users, Coins, Wallet } from "lucide-react";

type Settings = {
  is_enabled: boolean;
  launch_date: string;
  welcome_credit_amount: number;
  welcome_min_order: number;
  welcome_expiry_days: number;
  referral_credit_amount: number;
  referral_points: number;
  referral_hold_days: number;
  referral_credit_expiry_days: number;
  referral_monthly_limit: number;
  referral_min_order: number;
  points_per_mnt: number;
  point_value_mnt: number;
  redemption_cap_percent: number;
  points_expiry_months: number;
  engagement_monthly_cap: number;
};

const FIELDS: { key: keyof Settings; label: string; hint?: string; step?: string }[] = [
  { key: "welcome_credit_amount", label: "Welcome EasyCredit (₮)" },
  { key: "welcome_min_order", label: "Welcome доод захиалга (₮)" },
  { key: "welcome_expiry_days", label: "Welcome хүчинтэй хоног" },
  { key: "referral_credit_amount", label: "Referral кредит — уригдсан (₮)" },
  { key: "referral_points", label: "Referral оноо — уригч" },
  { key: "referral_min_order", label: "Referral доод захиалга (₮)" },
  { key: "referral_hold_days", label: "Баталгаажих хүлээх хоног" },
  { key: "referral_credit_expiry_days", label: "Referral кредит хүчинтэй хоног" },
  { key: "referral_monthly_limit", label: "Сарын referral лимит" },
  { key: "points_per_mnt", label: "1₮ тутамд олгох оноо", hint: "0.001 = 1,000₮ тутамд 1 оноо", step: "0.0001" },
  { key: "point_value_mnt", label: "1 оноо = хэдэн ₮", hint: "10 = 100 оноо 1,000₮" },
  { key: "redemption_cap_percent", label: "Нэг захиалгын дээд хямдрал (%)" },
  { key: "points_expiry_months", label: "Онооны хүчинтэй хугацаа (сар)" },
  { key: "engagement_monthly_cap", label: "Идэвхжилтийн сарын дээд оноо" },
];

export default function EasyRewardsManager() {
  const [cfg, setCfg] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ users: 0, points: 0, credit: 0, pending: 0 });

  const load = async () => {
    const [{ data }, { data: users }] = await Promise.all([
      supabase.from("easy_rewards_settings" as any).select("*").eq("id", 1).maybeSingle(),
      supabase.from("easy_rewards_users" as any).select("points_balance,credit_balance,pending_points"),
    ]);
    if (data) setCfg(data as any);
    const list = (users as any[]) || [];
    setStats({
      users: list.length,
      points: list.reduce((s, u) => s + (u.points_balance || 0), 0),
      credit: list.reduce((s, u) => s + Number(u.credit_balance || 0), 0),
      pending: list.reduce((s, u) => s + (u.pending_points || 0), 0),
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase
      .from("easy_rewards_settings" as any)
      .update({ ...cfg, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error("Хадгалахад алдаа: " + error.message);
    else toast.success("EasyRewards тохиргоо хадгалагдлаа ✓");
  };

  if (loading || !cfg) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCfg({ ...cfg, [k]: Number(e.target.value) || 0 });

  return (
    <div className="max-w-3xl space-y-6 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Gem className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">EasyRewards</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Хуучин урамшуулал, купон, wallet системээс бүрэн тусдаа шинэ модуль. Зөвхөн нээлтийн
            өдрөөс хойш бүртгүүлсэн, хуучин урамшуулал аваагүй хэрэглэгчид хамрагдана.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Хамрагдсан", value: stats.users.toLocaleString() },
          { icon: Coins, label: "Нийт оноо", value: stats.points.toLocaleString() },
          { icon: Wallet, label: "Нийт кредит", value: stats.credit.toLocaleString() + "₮" },
          { icon: Coins, label: "Хүлээгдэж буй оноо", value: stats.pending.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-3">
            <s.icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-lg font-bold mt-1">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="er_enabled" className="text-base">Систем идэвхтэй эсэх</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Унтраавал шинэ хэрэглэгч нэгдэхгүй, шинэ шагнал олгогдохгүй.
          </p>
        </div>
        <Switch
          id="er_enabled"
          checked={cfg.is_enabled}
          onCheckedChange={(v) => setCfg({ ...cfg, is_enabled: v })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="launch">Нээлтийн огноо (launch date)</Label>
        <Input
          id="launch"
          type="datetime-local"
          value={new Date(cfg.launch_date).toISOString().slice(0, 16)}
          onChange={(e) => setCfg({ ...cfg, launch_date: new Date(e.target.value).toISOString() })}
        />
        <p className="text-xs text-muted-foreground">
          Энэ огнооноос өмнө бүртгүүлсэн хэрэглэгч welcome болон referral шагналд хамрагдахгүй.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type="number"
              min="0"
              step={f.step || "1"}
              value={cfg[f.key] as number}
              onChange={num(f.key)}
            />
            {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Хадгалах
        </Button>
      </div>
    </div>
  );
}
