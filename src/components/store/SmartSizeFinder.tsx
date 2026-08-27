import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getSessionToken } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Ruler, ArrowLeft, Check, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  recommendSize,
  seedConfig,
  seedGuideRows,
  measurementLabel,
  SIZE_ORDER,
  clampHeight,
  clampWeight,
  type FitPreference,
  type GuideRow,
  type SizeConfig,
  type RecommendResult,
} from "@/lib/sizeFinder";

interface Props {
  productId: string;
  productCode?: string | null;
  sizes?: string[];
  selectedSize?: string | null;
  onSelectSize: (size: string) => void;
  onRecommend?: (size: string) => void;
  className?: string;
}

const HEIGHT_QUICK = [150, 155, 160, 165, 170, 175, 180];
const WEIGHT_QUICK = [45, 50, 55, 60, 65, 70, 75, 80];

const FIT_OPTIONS: { value: FitPreference; label: string; hint: string }[] = [
  { value: "tight", label: "Бариу", hint: "Биед наалдсан" },
  { value: "regular", label: "Энгийн", hint: "Стандарт" },
  { value: "loose", label: "Сул", hint: "Чөлөөтэй" },
];

const CONFIDENCE_UI = {
  high: { dot: "🟢", label: "Өндөр" },
  medium: { dot: "🟡", label: "Дунд" },
  low: { dot: "🔴", label: "Бага" },
} as const;

export default function SmartSizeFinder({
  productId,
  productCode,
  sizes,
  selectedSize,
  onSelectSize,
  onRecommend,
  className,
}: Props) {
  const { user } = useAuth();
  const [config, setConfig] = useState<SizeConfig | null>(null);
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [open, setOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [fit, setFit] = useState<FitPreference>("regular");
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [previousSize, setPreviousSize] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  // ---- data ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: cfgRow }, { data: guideRows }] = await Promise.all([
        supabase
          .from("size_recommendation_config" as any)
          .select("category, material, stretch_level, fit_type, algorithm_version, score_weights, height_weight_rules, chart_image_url, enabled")
          .eq("product_id", productId)
          .maybeSingle(),
        supabase
          .from("product_size_guides" as any)
          .select("size, measurement_type, measurement_value, unit, sort_order")
          .eq("product_id", productId),
      ]);
      if (cancelled) return;
      const cfg = (cfgRow as any) || seedConfig(productCode);
      const rows = (guideRows as any[])?.length ? (guideRows as any as GuideRow[]) : seedGuideRows(productCode);
      setConfig(cfg && cfg.enabled !== false ? (cfg as SizeConfig) : null);
      setGuides(rows || []);
    })();
    return () => { cancelled = true; };
  }, [productId, productCode]);

  // Prefill saved profile + previous size choice for logged-in users
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_size_profiles" as any)
        .select("height_cm, weight_kg, preferred_fit")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const d = data as any;
      if (d.height_cm) setHeight(String(d.height_cm));
      if (d.weight_kg) setWeight(String(d.weight_kg));
      if (d.preferred_fit) setFit(d.preferred_fit as FitPreference);
    })();
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("items")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled || !data) return;
      for (const o of data as any[]) {
        for (const it of (o.items || []) as any[]) {
          if (it?.product_id === productId && it?.size) {
            setPreviousSize(String(it.size));
            return;
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user, productId]);

  const logEvent = useCallback(
    (event_type: string, extra: Record<string, any> = {}) => {
      supabase
        .from("size_finder_events" as any)
        .insert({
          product_id: productId,
          user_id: user?.id ?? null,
          session_token: getSessionToken(),
          event_type,
          ...extra,
        } as any)
        .then(() => {}, () => {});
    },
    [productId, user],
  );

  const availableSizes = useMemo(
    () => (sizes?.length ? sizes : SIZE_ORDER.map(String)),
    [sizes],
  );

  const guideSizes = useMemo(() => {
    const set = new Set(guides.map((g) => String(g.size).toUpperCase()));
    return SIZE_ORDER.filter((s) => set.has(s));
  }, [guides]);

  const guideTypes = useMemo(() => {
    const seen: string[] = [];
    [...guides]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .forEach((g) => { if (!seen.includes(g.measurement_type)) seen.push(g.measurement_type); });
    return seen;
  }, [guides]);

  if (!config || guides.length === 0) return null;

  // ---- actions ------------------------------------------------------------
  const openFinder = () => {
    setStep(result ? 4 : 1);
    setOpen(true);
    logEvent("size_finder_opened");
  };

  const compute = (fitPref: FitPreference) => {
    const h = clampHeight(Number(height));
    const w = clampWeight(Number(weight));
    const res = recommendSize({
      heightCm: h,
      weightKg: w,
      fitPreference: fitPref,
      config,
      guides,
      availableSizes,
      previousSize,
    });
    setResult(res);
    setStep(4);
    onRecommend?.(res.recommendedSize);
    logEvent("size_recommended", {
      recommended_size: res.recommendedSize,
      height_cm: h,
      weight_kg: w,
      fit_preference: fitPref,
      confidence: res.confidence,
      metadata: { algorithm_version: res.algorithmVersion, borderline: res.borderline },
    });
    logEvent("size_finder_completed", { recommended_size: res.recommendedSize });
  };

  const nextFromHeight = () => {
    const h = Number(height);
    if (!h || h < 140 || h > 200) {
      toast.error("Өндрөө 140–200 см хооронд оруулна уу");
      return;
    }
    logEvent("height_entered", { height_cm: h });
    setStep(2);
  };

  const nextFromWeight = () => {
    const w = Number(weight);
    if (!w || w < 35 || w > 150) {
      toast.error("Жингээ 35–150 кг хооронд оруулна уу");
      return;
    }
    logEvent("weight_entered", { weight_kg: w });
    setStep(3);
  };

  const chooseFit = (value: FitPreference) => {
    setFit(value);
    logEvent("fit_selected", { fit_preference: value });
    compute(value);
  };

  const applySize = (size: string) => {
    onSelectSize(size);
    logEvent("size_selected", {
      recommended_size: result?.recommendedSize ?? null,
      selected_size: size,
      height_cm: Number(height) || null,
      weight_kg: Number(weight) || null,
      fit_preference: fit,
    });
    if (result && size !== result.recommendedSize) {
      logEvent("recommendation_changed", { recommended_size: result.recommendedSize, selected_size: size });
    }
    setOpen(false);
    toast.success(`${size} размер сонголоо`);
  };

  const saveProfile = async () => {
    if (!user) {
      toast.info("Хадгалахын тулд нэвтэрнэ үү");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("user_size_profiles" as any)
      .upsert(
        {
          user_id: user.id,
          height_cm: clampHeight(Number(height)),
          weight_kg: clampWeight(Number(weight)),
          preferred_fit: fit,
        } as any,
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) toast.error("Хадгалахад алдаа гарлаа");
    else {
      setSavedProfile(true);
      toast.success("Өндөр, жин хадгалагдлаа");
    }
  };

  const progress = Math.min(step, 3);

  return (
    <div className={className}>
      <div className="rounded-2xl border border-border bg-secondary/40 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-primary" />
          <p className="text-[13px] font-bold text-foreground">📏 Танд аль размер тохирох вэ?</p>
        </div>
        {result && (
          <p className="text-[11px] font-semibold text-primary">
            Санал болгож буй размер: {result.recommendedSize}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={openFinder} className="h-11 rounded-xl font-bold flex-1">
            Размер сонгоход тусалъя
          </Button>
          <Button
            variant="outline"
            onClick={() => setChartOpen(true)}
            className="h-11 rounded-xl font-semibold flex-1 gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            Албан ёсны хэмжээ
          </Button>
        </div>
      </div>

      {/* --------------------------- Finder modal --------------------------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            {step > 1 && step < 4 ? (
              <button onClick={() => setStep(step - 1)} className="p-1 -ml-1 text-muted-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : <span />}
            {step < 4 && (
              <span className="text-xs font-bold text-muted-foreground">{progress} / 3</span>
            )}
          </div>

          {step < 4 && (
            <div className="px-4 pt-3">
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="p-4 space-y-4">
            {step === 1 && (
              <>
                <h3 className="text-lg font-bold">Таны өндөр хэд вэ?</h3>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="165"
                    className="h-14 text-lg font-bold rounded-xl"
                  />
                  <span className="text-base font-semibold text-muted-foreground">см</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {HEIGHT_QUICK.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHeight(String(h))}
                      className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors ${
                        Number(height) === h ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                  <button
                    onClick={() => setHeight("180")}
                    className="h-11 rounded-xl text-sm font-bold border-2 border-border bg-background"
                  >
                    180+
                  </button>
                </div>
                <Button onClick={nextFromHeight} className="w-full h-12 rounded-xl font-bold">
                  Үргэлжлүүлэх
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <h3 className="text-lg font-bold">Таны жин хэд вэ?</h3>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="60"
                    className="h-14 text-lg font-bold rounded-xl"
                  />
                  <span className="text-base font-semibold text-muted-foreground">кг</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {WEIGHT_QUICK.map((w) => (
                    <button
                      key={w}
                      onClick={() => setWeight(String(w))}
                      className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors ${
                        Number(weight) === w ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <Button onClick={nextFromWeight} className="w-full h-12 rounded-xl font-bold">
                  Үргэлжлүүлэх
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <h3 className="text-lg font-bold">Та хувцсаа ямар байдлаар өмсөх дуртай вэ?</h3>
                <div className="grid grid-cols-3 gap-2">
                  {FIT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => chooseFit(o.value)}
                      className={`h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                        fit === o.value ? "border-primary bg-primary/10" : "border-border bg-background"
                      }`}
                    >
                      <span className="text-sm font-bold">{o.label}</span>
                      <span className="text-[10px] text-muted-foreground">{o.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Сонголт хийхэд шууд үр дүн харагдана. Анхдагч нь “Энгийн”.
                </p>
                <Button variant="outline" onClick={() => chooseFit("regular")} className="w-full h-11 rounded-xl font-semibold">
                  Энгийнээр үргэлжлүүлэх
                </Button>
              </>
            )}

            {step === 4 && result && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-primary/10 border-2 border-primary/30 p-4 text-center space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    🎯 Танд санал болгож буй размер
                  </p>
                  <p className="text-5xl font-black text-primary leading-none py-1">
                    {result.recommendedSize}
                  </p>
                  <p className="text-[12px] text-foreground/80 leading-relaxed">{result.explanation}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { k: "Өндөр", v: `${clampHeight(Number(height))} см` },
                    { k: "Жин", v: `${clampWeight(Number(weight))} кг` },
                    { k: "Өмсгөл", v: FIT_OPTIONS.find((f) => f.value === result.fitPreference)?.label || "Энгийн" },
                  ].map((x) => (
                    <div key={x.k} className="rounded-xl bg-secondary/60 py-2">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">{x.k}</p>
                      <p className="text-sm font-bold">{x.v}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                  <span>Итгэлцлийн түвшин:</span>
                  <span>{CONFIDENCE_UI[result.confidence].dot} {CONFIDENCE_UI[result.confidence].label}</span>
                </div>

                {previousSize && (
                  <p className="text-[12px] text-center font-medium text-muted-foreground">
                    {previousSize === result.recommendedSize
                      ? `🎯 ${result.recommendedSize} размер — таны өмнөх сонголттой тохирч байна.`
                      : `Таны өмнөх сонголт: ${previousSize}. Энэ бүтээгдэхүүний эсгүүр өмнөх сонголтоос өөр байна.`}
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-2">
                  {availableSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => applySize(s)}
                      className={`min-w-[56px] h-11 px-3 rounded-xl border-2 text-sm font-bold transition-colors ${
                        s === result.recommendedSize
                          ? "border-primary bg-primary/10 text-primary"
                          : selectedSize === s
                          ? "border-foreground"
                          : "border-border"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => applySize(result.recommendedSize)}
                  className="w-full h-12 rounded-xl font-bold gap-2"
                >
                  <Check className="h-4 w-4" />
                  {result.recommendedSize} размер сонгох
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold" onClick={() => setStep(1)}>
                    Дахин тооцоолох
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-semibold"
                    onClick={saveProfile}
                    disabled={saving || savedProfile}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedProfile ? "Хадгалагдсан" : "Өндөр, жингээ хадгалах"}
                  </Button>
                </div>

                <button
                  onClick={() => { setOpen(false); setChartOpen(true); }}
                  className="w-full text-[12px] font-semibold text-primary underline underline-offset-2"
                >
                  📋 Албан ёсны хэмжээний хүснэгт харах
                </button>

                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  Энэ бол хамгийн тохиромжтой сонголтын санал бөгөөд биеийн онцлогоос хамаарч ялгаатай байж болно.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* --------------------------- Official chart -------------------------- */}
      <Sheet open={chartOpen} onOpenChange={setChartOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-base">📋 ELLE Sport-ийн албан ёсны хэмжээ</SheetTitle>
          </SheetHeader>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-2">
            Бүтээгдэхүүний хэмжээс
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase">Хэмжээс</th>
                  {guideSizes.map((s) => (
                    <th key={s} className="px-3 py-2 text-center text-[11px] font-bold uppercase">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {guideTypes.map((t) => (
                  <tr key={t}>
                    <td className="px-3 py-2 font-semibold text-[12px]">{measurementLabel(t)}</td>
                    {guideSizes.map((s) => {
                      const row = guides.find(
                        (g) => g.measurement_type === t && String(g.size).toUpperCase() === s,
                      );
                      return (
                        <td key={s} className="px-3 py-2 text-center text-[12px]">
                          {row ? `${row.measurement_value} ${row.unit || "cm"}` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {config.material && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground">Материал:</span> {config.material}
            </p>
          )}
          {config.chart_image_url && (
            <img src={config.chart_image_url} alt="ELLE Sport хэмжээний хүснэгт" className="mt-3 w-full rounded-xl" loading="lazy" />
          )}
          <p className="mt-3 mb-4 text-[11px] text-muted-foreground leading-relaxed">
            Эдгээр нь хувцасны өөрийн хэмжээс бөгөөд хүний биеийн хэмжээс биш.
          </p>
        </SheetContent>
      </Sheet>
    </div>
  );
}
