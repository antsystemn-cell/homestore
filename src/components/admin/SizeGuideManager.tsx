import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  SIZE_ORDER,
  measurementLabel,
  MEASUREMENT_LABELS,
  recommendSize,
  type GuideRow,
  type SizeCategory,
  type SizeConfig,
} from "@/lib/sizeFinder";

interface ProductLite {
  id: string;
  name: string;
  product_code: string | null;
  sizes: string[] | null;
}

const CATEGORIES: { value: SizeCategory; label: string }[] = [
  { value: "bra", label: "Бра / Sports Bra" },
  { value: "leggings", label: "Өмд / Leggings / Joggers" },
  { value: "top", label: "Цамц / Top / T-Shirt" },
  { value: "jacket", label: "Хүрэм / Jacket / Hoodie" },
];

const STRETCH = ["Low", "Medium", "Medium-High", "High"];
const FITS = ["Slim Fit", "Regular Fit", "Oversized"];
const TYPES = Object.keys(MEASUREMENT_LABELS);

export default function SizeGuideManager() {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [category, setCategory] = useState<SizeCategory>("top");
  const [material, setMaterial] = useState("");
  const [stretch, setStretch] = useState("Medium");
  const [fitType, setFitType] = useState("Regular Fit");
  const [chartImage, setChartImage] = useState("");
  const [rows, setRows] = useState<GuideRow[]>([]);

  const [pvHeight, setPvHeight] = useState("165");
  const [pvWeight, setPvWeight] = useState("60");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, product_code, sizes")
        .not("sizes", "is", null)
        .order("product_code", { ascending: true });
      const list = ((data as any[]) || []).filter((p) => (p.sizes || []).length > 0);
      setProducts(list as ProductLite[]);
      setLoading(false);
      if (list.length && !productId) setProductId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    (async () => {
      const [{ data: cfg }, { data: guides }] = await Promise.all([
        supabase.from("size_recommendation_config" as any).select("*").eq("product_id", productId).maybeSingle(),
        supabase
          .from("product_size_guides" as any)
          .select("size, measurement_type, measurement_value, unit, sort_order")
          .eq("product_id", productId),
      ]);
      if (cancelled) return;
      const c = cfg as any;
      setEnabled(c?.enabled ?? true);
      setCategory((c?.category as SizeCategory) || "top");
      setMaterial(c?.material || "");
      setStretch(c?.stretch_level || "Medium");
      setFitType(c?.fit_type || "Regular Fit");
      setChartImage(c?.chart_image_url || "");
      setRows(((guides as any[]) || []) as GuideRow[]);
    })();
    return () => { cancelled = true; };
  }, [productId]);

  const types = useMemo(() => {
    const seen: string[] = [];
    [...rows]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .forEach((r) => { if (!seen.includes(r.measurement_type)) seen.push(r.measurement_type); });
    return seen;
  }, [rows]);

  const valueOf = (type: string, size: string) =>
    rows.find((r) => r.measurement_type === type && String(r.size).toUpperCase() === size)?.measurement_value;

  const setValue = (type: string, size: string, value: string) => {
    const num = value === "" ? NaN : Number(value);
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.measurement_type === type && String(r.size).toUpperCase() === size);
      if (Number.isNaN(num)) return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], measurement_value: num };
        return next;
      }
      return [...prev, { size, measurement_type: type, measurement_value: num, unit: "cm", sort_order: types.length }];
    });
  };

  const addType = (type: string) => {
    if (!type || types.includes(type)) return;
    setRows((prev) => [...prev, { size: "S", measurement_type: type, measurement_value: 0, unit: "cm", sort_order: types.length }]);
  };

  const removeType = (type: string) => setRows((prev) => prev.filter((r) => r.measurement_type !== type));

  const save = async () => {
    if (!productId) return;
    setSaving(true);
    const { error: cfgErr } = await supabase.from("size_recommendation_config" as any).upsert(
      {
        product_id: productId,
        category,
        material: material || null,
        stretch_level: stretch,
        fit_type: fitType,
        chart_image_url: chartImage || null,
        enabled,
      } as any,
      { onConflict: "product_id" },
    );
    await supabase.from("product_size_guides" as any).delete().eq("product_id", productId);
    const payload = rows
      .filter((r) => Number.isFinite(Number(r.measurement_value)))
      .map((r, i) => ({
        product_id: productId,
        size: String(r.size).toUpperCase(),
        measurement_type: r.measurement_type,
        measurement_value: Number(r.measurement_value),
        unit: r.unit || "cm",
        source: "ELLE official",
        sort_order: types.indexOf(r.measurement_type) >= 0 ? types.indexOf(r.measurement_type) : i,
      }));
    const { error: gErr } = payload.length
      ? await supabase.from("product_size_guides" as any).insert(payload as any)
      : { error: null as any };
    setSaving(false);
    if (cfgErr || gErr) toast.error("Хадгалахад алдаа гарлаа");
    else toast.success("Хэмжээний тохиргоо хадгалагдлаа");
  };

  const preview = useMemo(() => {
    if (!rows.length) return null;
    const cfg: SizeConfig = { category, material, stretch_level: stretch, fit_type: fitType, enabled };
    const product = products.find((p) => p.id === productId);
    try {
      return recommendSize({
        heightCm: Number(pvHeight) || 165,
        weightKg: Number(pvWeight) || 60,
        fitPreference: "regular",
        config: cfg,
        guides: rows,
        availableSizes: product?.sizes || SIZE_ORDER.map(String),
      });
    } catch {
      return null;
    }
  }, [rows, category, material, stretch, fitType, enabled, pvHeight, pvWeight, products, productId]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ruler className="h-4 w-4" /> Smart Size Finder
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-xs font-semibold">{enabled ? "Идэвхтэй" : "Идэвхгүй"}</span>
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Бараа</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Бараа сонгох" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.product_code ? `${p.product_code} · ` : ""}{p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Ангилал</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SizeCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Материал</Label>
            <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="75% Nylon / 25% Spandex" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Суналт</Label>
              <Select value={stretch} onValueChange={setStretch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STRETCH.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Эсгүүр</Label>
              <Select value={fitType} onValueChange={setFitType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FITS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Албан ёсны хэмжээний зургийн холбоос (заавал биш)</Label>
            <Input value={chartImage} onChange={(e) => setChartImage(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">
              Бүтээгдэхүүний хэмжээс (см) — S / M / L / XL
            </Label>
            <Select value="" onValueChange={addType}>
              <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="+ Хэмжээс нэмэх" /></SelectTrigger>
              <SelectContent>
                {TYPES.filter((t) => !types.includes(t)).map((t) => (
                  <SelectItem key={t} value={t}>{measurementLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase">Хэмжээс</th>
                  {SIZE_ORDER.map((s) => (
                    <th key={s} className="px-3 py-2 text-center text-[10px] font-bold uppercase">{s}</th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {types.map((t) => (
                  <tr key={t}>
                    <td className="px-3 py-1.5 font-semibold text-xs whitespace-nowrap">{measurementLabel(t)}</td>
                    {SIZE_ORDER.map((s) => (
                      <td key={s} className="px-2 py-1.5">
                        <Input
                          type="number"
                          step="0.25"
                          className="h-8 text-center"
                          value={valueOf(t, s) ?? ""}
                          onChange={(e) => setValue(t, s, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="px-2 text-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeType(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {types.length === 0 && (
              <div className="py-8 text-center text-xs italic text-muted-foreground">
                Хэмжээс нэмнэ үү (жишээ: цээж, бэлхүүс, урт).
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Эдгээр нь хувцасны өөрийн хэмжээс (flat) бөгөөд хүний биеийн хэмжээс биш.
          </p>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3 bg-secondary/20">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Санал болголтыг урьдчилан харах
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Өндөр (см)</Label>
              <Input className="h-9 w-28" value={pvHeight} onChange={(e) => setPvHeight(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Жин (кг)</Label>
              <Input className="h-9 w-28" value={pvWeight} onChange={(e) => setPvWeight(e.target.value)} />
            </div>
            {preview && (
              <div className="text-sm">
                <span className="font-bold text-primary text-lg mr-2">{preview.recommendedSize}</span>
                <span className="text-xs text-muted-foreground">
                  ({preview.confidence === "high" ? "Өндөр" : preview.confidence === "medium" ? "Дунд" : "Бага"} итгэлцэл)
                </span>
              </div>
            )}
          </div>
          {preview && <p className="text-[11px] text-muted-foreground">{preview.explanation}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
