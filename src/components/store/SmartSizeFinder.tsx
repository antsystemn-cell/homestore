import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getSessionToken } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Ruler,
  ArrowLeft,
  Check,
  ClipboardList,
  Loader2,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Save,
  MoveVertical,
  Scale,
  Shirt,
} from "lucide-react";
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
  high: { dot: "bg-primary", label: "Өндөр", chip: "border-primary/30 bg-primary/10 text-primary" },
  medium: { dot: "bg-accent", label: "Дунд", chip: "border-accent/50 bg-accent/15 text-foreground" },
  low: { dot: "bg-destructive", label: "Бага", chip: "border-destructive/30 bg-destructive/10 text-destructive" },
} as const;

const STEP_META = [
  { title: "Таны өндөр хэд вэ?", sub: "Сантиметрээр оруулна уу" },
  { title: "Таны жин хэд вэ?", sub: "Килограммаар оруулна уу" },
  { title: "Ямар өмсгөлд дуртай вэ?", sub: "Сонголтоо дармагц үр дүн гарна" },
];

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
  const [dir, setDir] = useState(1);
  const [computing, setComputing] = useState(false);
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
    setDir(1);
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
    setDir(1);
    setStep(2);
  };

  const nextFromWeight = () => {
    const w = Number(weight);
    if (!w || w < 35 || w > 150) {
      toast.error("Жингээ 35–150 кг хооронд оруулна уу");
      return;
    }
    logEvent("weight_entered", { weight_kg: w });
    setDir(1);
    setStep(3);
  };

  const chooseFit = (value: FitPreference) => {
    setFit(value);
    logEvent("fit_selected", { fit_preference: value });
    setComputing(true);
    window.setTimeout(() => {
      compute(value);
      setDir(1);
      setComputing(false);
    }, 900);
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
  const conf = result ? CONFIDENCE_UI[result.confidence] : null;

  return (
    <div className={className}>
      <style>{`
        @keyframes ssf-in-r { from { opacity: 0; transform: translateX(56px) scale(0.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes ssf-in-l { from { opacity: 0; transform: translateX(-56px) scale(0.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes ssf-pop { 0% { opacity: 0; transform: scale(0.4) rotate(-8deg); } 65% { transform: scale(1.12) rotate(2deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes ssf-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ssf-dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.15); opacity: 1; } }
        @keyframes ssf-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }
        @keyframes ssf-ring { 0% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.35); } 100% { box-shadow: 0 0 0 18px hsl(var(--primary) / 0); } }
        .ssf-anim-r { animation: ssf-in-r 0.45s cubic-bezier(0.22, 1, 0.36, 1); }
        .ssf-anim-l { animation: ssf-in-l 0.45s cubic-bezier(0.22, 1, 0.36, 1); }
        .ssf-anim-r > *, .ssf-anim-l > * { animation: ssf-fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .ssf-anim-r > *:nth-child(2), .ssf-anim-l > *:nth-child(2) { animation-delay: 0.07s; }
        .ssf-anim-r > *:nth-child(3), .ssf-anim-l > *:nth-child(3) { animation-delay: 0.14s; }
        .ssf-anim-r > *:nth-child(4), .ssf-anim-l > *:nth-child(4) { animation-delay: 0.21s; }
        .ssf-pop { animation: ssf-pop 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) both, ssf-ring 1.4s ease-out 0.5s 2; }
        .ssf-fade-up { animation: ssf-fade-up 0.4s ease-out both; }
        .ssf-stagger > * { animation: ssf-fade-up 0.45s ease-out both; }
        .ssf-stagger > *:nth-child(2) { animation-delay: 0.09s; }
        .ssf-stagger > *:nth-child(3) { animation-delay: 0.18s; }
        .ssf-load-dot { animation: ssf-dot 1.1s ease-in-out infinite; }
        .ssf-load-dot:nth-child(2) { animation-delay: 0.15s; }
        .ssf-load-dot:nth-child(3) { animation-delay: 0.3s; }
        .ssf-bar { animation: ssf-bar 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ssf-anim-r, .ssf-anim-l, .ssf-anim-r > *, .ssf-anim-l > *, .ssf-pop, .ssf-fade-up, .ssf-stagger > *, .ssf-load-dot, .ssf-bar { animation: none !important; }
        }
      `}</style>

      {/* --------------------------- Trigger card ---------------------------- */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-secondary/50 to-accent/10 p-4">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
            <Ruler className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-foreground leading-tight">
              Танд аль размер тохирох вэ?
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Зөвхөн өндөр, жингээ оруулаад өөрийн хэмжээгээ мэдээрэй
            </p>
          </div>
        </div>

        {result && (
          <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-background/70 border border-primary/20 px-3 py-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-[11px] font-black">
              {result.recommendedSize}
            </span>
            <p className="text-[11px] font-semibold text-foreground">
              Сүүлийн санал: <span className="text-primary font-extrabold">{result.recommendedSize}</span>
            </p>
          </div>
        )}

        <div className="relative mt-3 flex flex-col gap-2">
          <Button
            onClick={openFinder}
            className="h-11 rounded-xl font-bold w-full justify-center gap-1.5 shadow-md shadow-primary/20 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97]"
          >
            <Sparkles className="h-4 w-4" />
            Размер сонгоход тусалъя
          </Button>
          <Button
            variant="outline"
            onClick={() => setChartOpen(true)}
            className="h-11 rounded-xl font-semibold w-full justify-center gap-2 bg-background/70"
          >
            <ClipboardList className="h-4 w-4" />
            Албан ёсны хэмжээ
          </Button>
        </div>
      </div>

      {/* --------------------------- Finder modal --------------------------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 gap-0 overflow-hidden border-primary/15">
          {/* gradient header strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="flex items-center justify-between px-5 pt-4">
            {step > 1 && step < 4 ? (
              <button
                onClick={() => { setDir(-1); setStep(step - 1); }}
                className="grid h-9 w-9 -ml-2 place-items-center rounded-full text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground active:scale-90"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : <span className="h-9 w-9" />}

            {step < 4 ? (
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      n === step ? "w-7 bg-primary" : n < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                Үр дүн
              </span>
            )}
            <span className="h-9 w-9" />
          </div>

          <div
            key={step}
            className={`px-5 pb-5 pt-2 space-y-5 relative ${dir === 1 ? "ssf-anim-r" : "ssf-anim-l"}`}
          >
            {computing && (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-b-3xl bg-background/80 backdrop-blur-sm ssf-fade-up">
                <div className="flex flex-col items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    Танд тохирох размер тооцоолж байна
                    <span className="inline-flex ml-1 gap-0.5">
                      <span className="ssf-load-dot inline-block">.</span>
                      <span className="ssf-load-dot inline-block">.</span>
                      <span className="ssf-load-dot inline-block">.</span>
                    </span>
                  </p>
                  <div className="h-1.5 w-40 overflow-hidden rounded-full bg-primary/15">
                    <div className="ssf-bar h-full w-1/3 rounded-full bg-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Өндөр, жин, өмсгөлийг харьцаулж байна</p>

                </div>
              </div>
            )}
            {step < 4 && (
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black tracking-tight">{STEP_META[step - 1].title}</h3>
                <p className="text-xs text-muted-foreground font-medium">{STEP_META[step - 1].sub}</p>
              </div>
            )}

            {step === 1 && (
              <>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary">
                    <MoveVertical className="h-5 w-5" />
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="165"
                    className="h-16 rounded-2xl pl-12 pr-14 text-center text-3xl font-black tracking-wide border-2 transition-all duration-200 focus-visible:border-primary focus-visible:shadow-lg focus-visible:shadow-primary/15"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground transition-colors duration-200 group-focus-within:text-primary">
                    см
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 ssf-stagger">
                  {HEIGHT_QUICK.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHeight(String(h))}
                      className={`h-11 rounded-xl text-sm font-bold border-2 transition-all duration-150 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm ${
                        Number(height) === h
                          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30 scale-[1.03]"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                  <button
                    onClick={() => setHeight("180")}
                    className={`h-11 rounded-xl text-sm font-bold border-2 transition-all duration-150 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm ${
                      Number(height) >= 180
                        ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30 scale-[1.03]"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    180+
                  </button>
                </div>
                <Button onClick={nextFromHeight} className="w-full h-12 rounded-xl font-bold gap-1.5 shadow-md shadow-primary/20">
                  Үргэлжлүүлэх
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary">
                    <Scale className="h-5 w-5" />
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="60"
                    className="h-16 rounded-2xl pl-12 pr-14 text-center text-3xl font-black tracking-wide border-2 transition-all duration-200 focus-visible:border-primary focus-visible:shadow-lg focus-visible:shadow-primary/15"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground transition-colors duration-200 group-focus-within:text-primary">
                    кг
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 ssf-stagger">
                  {WEIGHT_QUICK.map((w) => (
                    <button
                      key={w}
                      onClick={() => setWeight(String(w))}
                      className={`h-11 rounded-xl text-sm font-bold border-2 transition-all duration-150 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm ${
                        Number(weight) === w
                          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30 scale-[1.03]"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <Button onClick={nextFromWeight} className="w-full h-12 rounded-xl font-bold gap-1.5 shadow-md shadow-primary/20">
                  Үргэлжлүүлэх
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid grid-cols-3 gap-2.5 ssf-stagger">
                  {FIT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => chooseFit(o.value)}
                      disabled={computing}
                      className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:pointer-events-none ${
                        fit === o.value
                          ? "border-primary bg-primary/[0.08] shadow-sm"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full transition-all duration-200 ${
                          fit === o.value ? "bg-primary text-primary-foreground scale-110" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Shirt className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-extrabold">{o.label}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{o.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  Сонголт хийхэд шууд үр дүн харагдана. Анхдагч нь “Энгийн”.
                </p>
                <Button variant="outline" onClick={() => chooseFit("regular")} disabled={computing} className="w-full h-11 rounded-xl font-semibold">
                  Энгийнээр үргэлжлүүлэх
                </Button>
              </>
            )}

            {step === 4 && result && (
              <div className="space-y-5">
                {/* Result hero */}
                <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/[0.08] to-transparent px-5 pt-6 pb-5 text-center ssf-fade-up">
                  <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
                  <p className="relative text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
                    Танд санал болгож буй размер
                  </p>
                  <div className="ssf-pop relative mx-auto my-4 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/15">
                    <span className="text-4xl font-black tracking-tight">{result.recommendedSize}</span>
                  </div>
                  <p className="relative text-[12px] text-foreground/80 leading-relaxed max-w-[280px] mx-auto">
                    {result.explanation}
                  </p>
                  {conf && (
                    <span className={`relative mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${conf.chip}`}>
                      <span className={`h-2 w-2 rounded-full ${conf.dot}`} />
                      Итгэлцэл: {conf.label}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center ssf-stagger">
                  {[
                    { k: "Өндөр", v: `${clampHeight(Number(height))} см` },
                    { k: "Жин", v: `${clampWeight(Number(weight))} кг` },
                    { k: "Өмсгөл", v: FIT_OPTIONS.find((f) => f.value === result.fitPreference)?.label || "Энгийн" },
                  ].map((x) => (
                    <div key={x.k} className="rounded-2xl border border-border bg-secondary/50 py-2.5">
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground">{x.k}</p>
                      <p className="text-sm font-extrabold mt-0.5">{x.v}</p>
                    </div>
                  ))}
                </div>

                {previousSize && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                    {previousSize === result.recommendedSize
                      ? `${result.recommendedSize} размер — таны өмнөх сонголттой тохирч байна`
                      : `Таны өмнөх сонголт: ${previousSize} — энэ бараанд ${result.recommendedSize} тохирно`}
                  </div>
                )}

                {/* Size picker */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground text-center">Өөр размер сонгох бол:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {availableSizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => applySize(s)}
                        className={`relative min-w-[56px] h-12 px-4 rounded-xl border-2 text-sm font-extrabold transition-all duration-150 active:scale-95 hover:-translate-y-0.5 hover:shadow-sm ${
                          s === result.recommendedSize
                            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                            : selectedSize === s
                            ? "border-foreground bg-foreground/5"
                            : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        {s}
                        {s === result.recommendedSize && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-1.5 py-px text-[8px] font-black uppercase tracking-wide text-accent-foreground shadow-sm">
                            Санал
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => applySize(result.recommendedSize)}
                  className="w-full h-12 rounded-xl font-bold gap-2 shadow-md shadow-primary/25"
                >
                  <Check className="h-4 w-4" />
                  {result.recommendedSize} размер сонгох
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-semibold gap-1.5"
                    onClick={() => { setDir(-1); setStep(1); }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Дахин тооцох
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-semibold gap-1.5"
                    onClick={saveProfile}
                    disabled={saving || savedProfile}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : savedProfile ? (
                      <>
                        <Check className="h-4 w-4" />
                        Хадгалагдсан
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Хэмжээгээ хадгалах
                      </>
                    )}
                  </Button>
                </div>

                <button
                  onClick={() => { setOpen(false); setChartOpen(true); }}
                  className="mx-auto flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline underline-offset-2"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Албан ёсны хэмжээний хүснэгт харах
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
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-base font-black">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="h-4 w-4" />
              </span>
              ELLE Sport-ийн албан ёсны хэмжээ
            </SheetTitle>
          </SheetHeader>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mt-2">
            Бүтээгдэхүүний хэмжээс
          </p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/[0.07]">
                  <th className="px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-primary">
                    Хэмжээс
                  </th>
                  {guideSizes.map((s) => (
                    <th
                      key={s}
                      className={`px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider ${
                        result?.recommendedSize === s ? "text-primary bg-primary/10" : "text-primary"
                      }`}
                    >
                      {s}
                      {result?.recommendedSize === s && (
                        <span className="block text-[8px] font-black normal-case tracking-normal">← Санал</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {guideTypes.map((t, i) => (
                  <tr key={t} className={i % 2 === 1 ? "bg-secondary/40" : ""}>
                    <td className="px-3 py-2.5 font-bold text-[12px]">{measurementLabel(t)}</td>
                    {guideSizes.map((s) => {
                      const row = guides.find(
                        (g) => g.measurement_type === t && String(g.size).toUpperCase() === s,
                      );
                      return (
                        <td
                          key={s}
                          className={`px-3 py-2.5 text-center text-[12px] font-medium ${
                            result?.recommendedSize === s ? "bg-primary/10 font-bold text-primary" : ""
                          }`}
                        >
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
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2.5">
              <Shirt className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[12px] text-muted-foreground">
                <span className="font-bold text-foreground">Материал:</span> {config.material}
              </p>
            </div>
          )}
          {config.chart_image_url && (
            <img
              src={config.chart_image_url}
              alt="ELLE Sport хэмжээний хүснэгт"
              className="mt-3 w-full rounded-2xl border border-border"
              loading="lazy"
            />
          )}
          <p className="mt-3 mb-4 rounded-xl bg-accent/15 border border-accent/30 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
            Эдгээр нь хувцасны өөрийн хэмжээс бөгөөд хүний биеийн хэмжээс биш.
          </p>
        </SheetContent>
      </Sheet>
    </div>
  );
}
