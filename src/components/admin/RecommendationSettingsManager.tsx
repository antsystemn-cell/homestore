import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, RotateCcw, Save, Sparkles } from "lucide-react";
import type { ScoreWeights } from "@/lib/recommendations";
import { invalidateRecommendationConfig } from "@/hooks/useRecommendationWeights";

const DEFAULTS: ScoreWeights = {
  category: 40,
  brand: 35,
  tokenOverlap: 12,
  maxTokenOverlapTokens: 4,
  priceProximity: 25,
  popularity: 10,
  saleBoost: 5,
};

const FIELDS: Array<{ key: keyof ScoreWeights; label: string; hint: string; step?: number }> = [
  { key: "category", label: "Ангилал таарах", hint: "Ижил ангиллын барааны жин" },
  { key: "brand", label: "Брэнд таарах", hint: "Ижил брэндийн барааны жин" },
  { key: "tokenOverlap", label: "Нэрний үг давхцал", hint: "Нэр дэх давхцсан үг бүрийн жин" },
  { key: "maxTokenOverlapTokens", label: "Хамгийн ихдээ давхцах үг", hint: "Хэдэн үгийг тоолох дээд хязгаар", step: 1 },
  { key: "priceProximity", label: "Үнэ ойролцоо байх", hint: "Үнэ ойртох тусам нэмэгдэх жин" },
  { key: "popularity", label: "Борлуулалт (popularity)", hint: "Их зарагдсан бараанд нэмэгдэх жин" },
  { key: "saleBoost", label: "Хямдрал нэмэлт", hint: "Хямдралтай бараанд нэмэх оноо" },
];

type Kind = "related" | "cart";

const TABS: Array<{ id: Kind; label: string; desc: string }> = [
  { id: "related", label: "Төстэй бараа", desc: "Барааны дэлгэрэнгүй хуудсан дээрх 'Төстэй бараа'" },
  { id: "cart", label: "Сагсны зөвлөмж", desc: "Сагсны хуудсан дээрх 'Танд санал болгох'" },
];

const WeightForm = ({
  values,
  onChange,
}: {
  values: ScoreWeights;
  onChange: (next: ScoreWeights) => void;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {FIELDS.map((f) => (
      <div key={f.key} className="space-y-1">
        <Label className="text-xs font-medium">{f.label}</Label>
        <Input
          type="number"
          min={0}
          step={f.step ?? 0.5}
          value={values[f.key]}
          onChange={(e) => onChange({ ...values, [f.key]: Number(e.target.value) || 0 })}
        />
        <p className="text-[11px] text-muted-foreground">{f.hint}</p>
      </div>
    ))}
  </div>
);

const RecommendationSettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<Kind>("related");
  const [related, setRelated] = useState<ScoreWeights>(DEFAULTS);
  const [cart, setCart] = useState<ScoreWeights>(DEFAULTS);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("recommendation_settings" as any)
          .select("related_weights, cart_weights")
          .eq("id", 1)
          .maybeSingle();
        if (data) {
          setRelated({ ...DEFAULTS, ...((data as any).related_weights || {}) });
          setCart({ ...DEFAULTS, ...((data as any).cart_weights || {}) });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("recommendation_settings" as any)
        .upsert({ id: 1, related_weights: related, cart_weights: cart, updated_at: new Date().toISOString() });
      if (error) throw error;
      invalidateRecommendationConfig();
      toast.success("Зөвлөмжийн жинлүүр хадгалагдлаа");
    } catch (e: any) {
      toast.error(e?.message || "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  };

  const resetActive = () => {
    if (active === "related") setRelated(DEFAULTS);
    else setCart(DEFAULTS);
    toast.message("Анхны утга руу буцаалаа (хадгалахаа бүү мартаарай)");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Зөвлөмжийн жинлүүр</h2>
          <p className="text-sm text-muted-foreground">
            Төстэй бараа болон сагсны зөвлөмжид ашиглах оноо тооцооны жинлүүрүүдийг тохируулна.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              active === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          {TABS.find((t) => t.id === active)?.desc}
        </p>
        {active === "related" ? (
          <WeightForm values={related} onChange={setRelated} />
        ) : (
          <WeightForm values={cart} onChange={setCart} />
        )}
      </Card>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={resetActive} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Анхны утга
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Хадгалах
        </Button>
      </div>
    </div>
  );
};

export default RecommendationSettingsManager;
