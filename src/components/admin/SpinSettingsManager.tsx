import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { refreshSpinEnabled } from "@/hooks/useSpinEnabled";

interface SpinConfig {
  id: number;
  is_enabled: boolean;
  signup_spins: number;
  referral_spins: number;
  invitee_referral_spins: number;
  daily_referral_cap: number;
  extra_spin_lifetime_cap: number;
  max_active_spins: number;
  spin_expiry_hours: number;
  reward_expiry_hours: number;
}

const SpinSettingsManager = () => {
  const [cfg, setCfg] = useState<SpinConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("spin_config" as any) as any)
      .select("*").eq("id", 1).maybeSingle();
    if (error) {
      toast.error("Ачаалахад алдаа");
    } else if (data) {
      setCfg(data as SpinConfig);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const save = async (patch: Partial<SpinConfig>) => {
    if (!cfg) return;
    setSaving(true);
    const next = { ...cfg, ...patch };
    const { error } = await (supabase.from("spin_config" as any) as any)
      .update(patch).eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа");
    } else {
      setCfg(next);
      refreshSpinEnabled();
      toast.success("Хадгаллаа");
    }
  };

  if (loading || !cfg) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Уншиж байна...
      </div>
    );
  }

  const N = (k: keyof SpinConfig, label: string, hint?: string) => (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="block text-xs text-muted-foreground mb-1">{hint}</span>}
      <input
        type="number"
        min={0}
        value={(cfg as any)[k] ?? 0}
        onChange={(e) => setCfg({ ...cfg, [k]: Number(e.target.value) } as SpinConfig)}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (v !== (cfg as any)[k]) save({ [k]: v } as any);
        }}
        className="mt-1 w-full rounded-xl bg-secondary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Хүрд эргүүлэх тоглоом
          </h2>
          <p className="text-sm text-muted-foreground">Ёндоо/шагналт хүрдний тохиргоо ба идэвх</p>
        </div>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Enable toggle */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">Идэвхтэй эсэх</p>
          <p className="text-xs text-muted-foreground mt-1">
            Асаасан үед хэрэглэгч /spin хуудсанд ороод хүрд эргүүлэх боломжтой болно. Хаасан үед FAB товч болон холбоос харагдахгүй.
          </p>
        </div>
        <Switch
          checked={cfg.is_enabled}
          onCheckedChange={(v) => save({ is_enabled: v })}
          disabled={saving}
        />
      </div>

      {/* Detailed settings */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="font-semibold text-foreground">Шагнал ба эргүүлгийн тохиргоо</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {N("signup_spins", "Бүртгүүлсэн үед өгөх эргүүлэг", "Шинэ хэрэглэгчид нэг удаагийн бэлэг")}
          {N("referral_spins", "Урьсан хүнд өгөх эргүүлэг", "Найзаа урьсан хэрэглэгчид нэмэгдэх")}
          {N("invitee_referral_spins", "Уригдсан хүнд өгөх эргүүлэг", "Урилгаар бүртгүүлсэн хүнд")}
          {N("daily_referral_cap", "Өдрийн урилгын дээд хязгаар")}
          {N("extra_spin_lifetime_cap", "Нэмэлт эргүүлгийн нийт хязгаар")}
          {N("max_active_spins", "Идэвхтэй эргүүлгийн дээд тоо")}
          {N("spin_expiry_hours", "Эргүүлгийн хугацаа (цаг)")}
          {N("reward_expiry_hours", "Шагналын хугацаа (цаг)")}
        </div>
        <p className="text-xs text-muted-foreground">Талбар дээр дарж утга солиод focus авахад автоматаар хадгална.</p>
      </div>

      <div className="bg-secondary/40 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Шагналын магадлал болон нарийн тохиргоо</p>
          <p className="text-xs text-muted-foreground">/admin/spin хуудсанд магадлал ба шагналуудыг засварлана</p>
        </div>
        <Link
          to="/admin/spin"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-bold hover:bg-primary/90"
        >
          Нээх <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default SpinSettingsManager;
