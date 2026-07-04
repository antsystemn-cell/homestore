import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles } from "lucide-react";

interface Config {
  is_enabled: boolean;
  earn_rate_percent: number;
  points_per_mnt: number;
  vip_threshold: number;
  min_redeem_points: number;
  max_redeem_percent: number;
}

const DEFAULTS: Config = {
  is_enabled: true,
  earn_rate_percent: 1,
  points_per_mnt: 1,
  vip_threshold: 3,
  min_redeem_points: 100,
  max_redeem_percent: 100,
};

export default function LoyaltySettingsManager() {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("loyalty_config" as any)
        .select("is_enabled,earn_rate_percent,points_per_mnt,vip_threshold,min_redeem_points,max_redeem_percent")
        .eq("id", 1)
        .maybeSingle();
      if (data) setCfg(data as any);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_config" as any)
      .upsert({ id: 1, ...cfg }, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа: " + error.message);
    } else {
      toast.success("Лоялти тохиргоо хадгалагдлаа ✓");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const num = (k: keyof Config) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCfg({ ...cfg, [k]: Number(e.target.value) || 0 });

  const exampleOrder = 100000;
  const exampleEarn = Math.floor((exampleOrder * cfg.earn_rate_percent) / 100);

  return (
    <div className="max-w-2xl space-y-6 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Лоялти оноо систем</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Хэрэглэгч захиалга хийхэд оноо цуглуулж, дараагийн худалдан авалтдаа хямдралд ашиглана.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="is_enabled" className="text-base">Систем идэвхтэй эсэх</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Унтраавал шинэ оноо олгохгүй, ашиглах ч боломжгүй.
          </p>
        </div>
        <Switch
          id="is_enabled"
          checked={cfg.is_enabled}
          onCheckedChange={(v) => setCfg({ ...cfg, is_enabled: v })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="earn_rate">Оноо олгох хувь (%)</Label>
          <Input id="earn_rate" type="number" step="0.1" min="0"
            value={cfg.earn_rate_percent} onChange={num("earn_rate_percent")} />
          <p className="text-xs text-muted-foreground">
            Хүргэгдсэн захиалгын дүнгийн энэ хувь = оноо
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ppm">1 оноо = хэдэн ₮</Label>
          <Input id="ppm" type="number" step="0.1" min="0.1"
            value={cfg.points_per_mnt} onChange={num("points_per_mnt")} />
          <p className="text-xs text-muted-foreground">Checkout дээр оноог хямдралд хөрвүүлэх ханш</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vip">VIP болох захиалгын тоо</Label>
          <Input id="vip" type="number" min="1"
            value={cfg.vip_threshold} onChange={num("vip_threshold")} />
          <p className="text-xs text-muted-foreground">Энэ тооноос дээш захиалгатай хэрэглэгч VIP</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="min_redeem">Хамгийн бага ашиглах оноо</Label>
          <Input id="min_redeem" type="number" min="0"
            value={cfg.min_redeem_points} onChange={num("min_redeem_points")} />
          <p className="text-xs text-muted-foreground">Үүнээс доош онооны нийлбэр ашиглах боломжгүй</p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="max_pct">Захиалгын дүнгийн хэдэн % хүртэл ашиглах вэ</Label>
          <Input id="max_pct" type="number" min="1" max="100"
            value={cfg.max_redeem_percent} onChange={num("max_redeem_percent")} />
          <p className="text-xs text-muted-foreground">
            Жнь: 50 гэвэл 100,000₮ захиалганд дээд тал нь 50,000 оноо ашиглана
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-secondary/40 border border-border p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Жишээ тооцоо</p>
        <p className="text-sm">
          {exampleOrder.toLocaleString()}₮ захиалга хүргэгдвэл{" "}
          <span className="font-semibold text-primary">{exampleEarn.toLocaleString()} оноо</span> нэмэгдэнэ.
        </p>
        <p className="text-sm">
          1,000 оноо ={" "}
          <span className="font-semibold text-primary">
            {Math.floor(1000 * cfg.points_per_mnt).toLocaleString()}₮
          </span>{" "}
          хямдрал.
        </p>
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
