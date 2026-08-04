import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Check, AlertCircle, Sparkles, User, Info, Shirt, Scissors, Apple } from "lucide-react";
import { toast } from "sonner";
import sizeGuideAsset from "@/assets/body-guide/size-guide-model.png.asset.json";

interface BodyProfile {
  height_cm: number;
  weight_kg: number;
  bust_cm: number;
  waist_cm: number;
  hip_cm: number;
  body_shape: 'Slim' | 'Regular' | 'Curvy' | 'Athletic';
  preferred_fit: 'Tight' | 'Regular' | 'Loose';
}

interface SizeResult {
  recommended: string;
  confidence: number;
  alternative?: string;
  reasoning: string;
}

type CategoryType = 'top' | 'bottom' | 'bra' | 'full';

export const ProductSizeFit = ({ product }: { product: Product }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SizeResult | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [shape, setShape] = useState<'Slim' | 'Regular' | 'Curvy' | 'Athletic'>('Regular');
  const [fit, setFit] = useState<'Tight' | 'Regular' | 'Loose'>('Regular');

  const normalizedBrand = (product.brandName || "").toLowerCase().replace(/\s+/g, "");
  const isElleSport = normalizedBrand.includes("elle") && normalizedBrand.includes("sport");

  const getProductCategory = (): CategoryType => {
    const name = product.name.toLowerCase();
    const cat = (product.category || "").toLowerCase();
    
    if (name.includes("bra") || cat.includes("bra") || name.includes("хөхний")) return 'bra';
    if (name.includes("leggings") || name.includes("pants") || name.includes("өмд") || name.includes("short") || cat.includes("өмд")) return 'bottom';
    if (name.includes("top") || name.includes("shirt") || name.includes("jacket") || name.includes("цамц") || name.includes("футболк")) return 'top';
    return 'full';
  };

  const productCategory = getProductCategory();

  const isClothing = product.category?.toLowerCase().includes("хувцас") || 
                     product.category?.toLowerCase().includes("activewear") ||
                     product.category?.toLowerCase().includes("clothing") ||
                     isElleSport;

  useEffect(() => {
    if (!user || !isClothing) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("body_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile(data as any);
        setHeight(data.height_cm.toString());
        setWeight(data.weight_kg.toString());
        setBust(data.bust_cm.toString());
        setWaist(data.waist_cm.toString());
        setHip(data.hip_cm.toString());
        setShape(data.body_shape as any);
        setFit(data.preferred_fit as any);
        calculateSize(data as any);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, isClothing, product.id]);

  const calculateSize = (profileData: BodyProfile) => {
    if (!product.size_chart || product.size_chart.length === 0) {
        setResult(null);
        return;
    }

    const scores = product.size_chart.map(s => {
        let score = 0;
        
        if (s.bust_width && profileData.bust_cm) {
            const bustTarget = s.bust_width * 2;
            const diff = Math.abs(bustTarget - profileData.bust_cm);
            const multiplier = productCategory === 'bra' ? 3 : (productCategory === 'top' ? 2 : 0.5);
            score += diff * multiplier;
        }
        
        if (s.waist_width && profileData.waist_cm) {
            const waistTarget = s.waist_width * 2;
            const diff = Math.abs(waistTarget - profileData.waist_cm);
            const multiplier = productCategory === 'bottom' ? 2.5 : 1.5;
            score += diff * multiplier;
        }
        
        if (s.hip_width && profileData.hip_cm) {
            const hipTarget = s.hip_width * 2;
            const diff = Math.abs(hipTarget - profileData.hip_cm);
            const multiplier = productCategory === 'bottom' ? 3 : 0.5;
            score += diff * multiplier;
        }

        if (product.stretch_level === 'High') score *= 0.7;
        if (product.stretch_level === 'Low') score *= 1.3;

        return { size: s.size, score };
    });

    scores.sort((a, b) => a.score - b.score);
    const best = scores[0];
    const second = scores[1];

    setResult({
        recommended: best.size,
        confidence: Math.max(75, Math.min(99, 100 - best.score)),
        alternative: second?.size,
        reasoning: `Таны биеийн хэмжээ болон энэхүү ${productCategory === 'bra' ? 'бра' : productCategory === 'bottom' ? 'өмд' : 'цамц'}-ны загварт үндэслэн ${best.size} хэмжээ хамгийн сайн тохирно.`
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    const profileData = {
      user_id: user.id,
      height_cm: parseFloat(height) || 0,
      weight_kg: parseFloat(weight) || 0,
      bust_cm: parseFloat(bust) || 0,
      waist_cm: parseFloat(waist) || 0,
      hip_cm: parseFloat(hip) || 0,
      body_shape: shape,
      preferred_fit: fit,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("body_profiles")
      .upsert(profileData);

    if (error) {
      toast.error("Алдаа гарлаа");
    } else {
      setProfile(profileData as any);
      calculateSize(profileData as any);
      setIsEditing(false);
      toast.success("Биеийн мэдээлэл хадгалагдлаа ✨");
    }
    setSaving(false);
  };

  const getOverlayStyle = (field: string | null) => {
    const base = "absolute border-2 border-orange-500 rounded-full animate-pulse transition-opacity duration-300";
    if (field === 'bust') return `${base} top-[28%] left-[50%] -translate-x-1/2 w-[40%] h-[5%] border-x-0 rounded-none opacity-100`;
    if (field === 'waist') return `${base} top-[42%] left-[50%] -translate-x-1/2 w-[35%] h-[5%] border-x-0 rounded-none opacity-100`;
    if (field === 'hip') return `${base} top-[55%] left-[50%] -translate-x-1/2 w-[45%] h-[5%] border-x-0 rounded-none opacity-100`;
    return `${base} opacity-0`;
  };

  if (!isClothing) return null;
  if (loading) return <div className="animate-pulse h-24 bg-secondary rounded-xl" />;

  return (
    <Card className="border-none shadow-sm bg-secondary/30 overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-1 rounded-md">
                <Ruler className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">
                {productCategory === 'bra' ? 'Бра' : productCategory === 'bottom' ? 'Өмд' : 'Цамц/Топ'} хэмжээ авах
            </CardTitle>
        </div>
        {!isEditing && profile && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-xs h-7 px-2">
                Засах
            </Button>
        )}
      </CardHeader>
      
      <CardContent className="pb-4">
        {!profile || isEditing ? (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Өндөр (см)</Label>
                      <Input value={height} onChange={e => setHeight(e.target.value)} type="number" placeholder="165" className="h-9 focus-visible:ring-orange-500" />
                  </div>
                  <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Жин (кг)</Label>
                      <Input value={weight} onChange={e => setWeight(e.target.value)} type="number" placeholder="55" className="h-9 focus-visible:ring-orange-500" />
                  </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                          Цээж (см) <Info className="h-2.5 w-2.5" />
                      </Label>
                      <Input 
                        value={bust} 
                        onChange={e => setBust(e.target.value)} 
                        onFocus={() => setActiveField('bust')}
                        onBlur={() => setActiveField(null)}
                        type="number" 
                        placeholder="85" 
                        className={`h-9 transition-all ${activeField === 'bust' ? 'border-orange-500 ring-1 ring-orange-500' : ''}`} 
                      />
                  </div>
                  <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                          Бэлхүүс (см) <Info className="h-2.5 w-2.5" />
                      </Label>
                      <Input 
                        value={waist} 
                        onChange={e => setWaist(e.target.value)} 
                        onFocus={() => setActiveField('waist')}
                        onBlur={() => setActiveField(null)}
                        type="number" 
                        placeholder="65" 
                        className={`h-9 transition-all ${activeField === 'waist' ? 'border-orange-500 ring-1 ring-orange-500' : ''}`} 
                      />
                  </div>
                  <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                          Түнх (см) <Info className="h-2.5 w-2.5" />
                      </Label>
                      <Input 
                        value={hip} 
                        onChange={e => setHip(e.target.value)} 
                        onFocus={() => setActiveField('hip')}
                        onBlur={() => setActiveField(null)}
                        type="number" 
                        placeholder="90" 
                        className={`h-9 transition-all ${activeField === 'hip' ? 'border-orange-500 ring-1 ring-orange-500' : ''}`} 
                      />
                  </div>
              </div>

              <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Биеийн галбир</Label>
                  <RadioGroup value={shape} onValueChange={(v: any) => setShape(v)} className="flex flex-wrap gap-2">
                      {[
                        { id: 'Slim', label: 'Турханхай', icon: <Scissors className="h-3 w-3" /> },
                        { id: 'Regular', label: 'Энгийн', icon: <Apple className="h-3 w-3" /> },
                        { id: 'Curvy', label: 'Мариалаг', icon: <Sparkles className="h-3 w-3" /> },
                        { id: 'Athletic', label: 'Тамирчин', icon: <Shirt className="h-3 w-3" /> }
                      ].map(s => (
                          <div key={s.id} className="flex items-center">
                              <RadioGroupItem value={s.id} id={`shape-${s.id}`} className="sr-only" />
                              <Label 
                                  htmlFor={`shape-${s.id}`} 
                                  className={`px-3 py-1.5 rounded-full text-[10px] border cursor-pointer transition-all flex items-center gap-1.5 ${shape === s.id ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-card border-border hover:border-orange-200'}`}
                              >
                                  {s.icon}
                                  {s.label}
                              </Label>
                          </div>
                      ))}
                  </RadioGroup>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 h-10 font-bold shadow-lg shadow-orange-500/20">
                  {saving ? "Хадгалж байна..." : "Хэмжээ тооцоолох"}
              </Button>
            </div>

            <div className="hidden md:block w-48 relative bg-white/50 rounded-xl border p-2 overflow-hidden group">
                <img 
                    src={sizeGuideAsset.url} 
                    alt="Body Measurement Guide" 
                    className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity" 
                />
                <div className={getOverlayStyle(activeField)} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 to-transparent p-3 pt-6">
                    <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tight">
                            {activeField === 'bust' ? 'Цээжний тойрог хэмжих' : 
                             activeField === 'waist' ? 'Бэлхүүсний тойрог хэмжих' : 
                             activeField === 'hip' ? 'Түнхний тойрог хэмжих' : 
                             'Хэрхэн хэмжих вэ?'}
                        </p>
                        <p className="text-[9px] leading-tight text-muted-foreground font-medium">
                            {activeField === 'bust' ? 'Цээжний хамгийн товгор хэсгээр тойруулж хэмжинэ. Хэт чанга биш, чөлөөтэй байхаар бодно.' : 
                             activeField === 'waist' ? 'Их биеийн хамгийн нарийн хэсэг буюу хүйсний дээхнэ талаар хэмжинэ.' : 
                             activeField === 'hip' ? 'Өгзөгний хамгийн өргөн хэсгээр тойруулж хэмжинэ.' : 
                             'Зураг дээрх улаан хэсгүүдэд заасан шиг биеийн тойргийн хэмжээг оруулна уу.'}
                        </p>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {result ? (
                <div className="bg-card rounded-xl p-4 border border-orange-500/20 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-orange-500" />
                        </div>
                    </div>
                    
                    <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Санал болгож буй хэмжээ:</span>
                        <div className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-bold border border-emerald-500/20">
                            {result.confidence}% Тохиромжтой
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="text-5xl font-black text-orange-500 tracking-tighter drop-shadow-sm">{result.recommended}</div>
                        <div className="flex-1 bg-secondary/30 p-2 rounded-lg border border-border/50">
                            <p className="text-[11px] leading-snug text-foreground/80 font-medium">
                                {result.reasoning}
                            </p>
                        </div>
                    </div>

                    {result.alternative && (
                        <div className="mt-3 pt-3 border-t border-dashed border-border flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Info className="h-3 w-3" />
                                Сул өмсөх хүсэлтэй бол:
                            </div>
                            <span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded">{result.alternative}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-3 p-4 bg-orange-50/50 rounded-xl border border-dashed border-orange-200 text-muted-foreground">
                    <AlertCircle className="h-5 w-5 text-orange-400" />
                    <div className="flex-1">
                        <p className="text-[11px] font-medium leading-tight">Энэ бараанд хэмжээний дэлгэрэнгүй мэдээлэл ороогүй байна.</p>
                        <p className="text-[10px] opacity-70">Админ хэмжээний хүснэгт оруулсны дараа тооцоолох боломжтой. Энэ асуудлыг шийдэхийн тулд Админ хэсэгт барааны хэмжээний хүснэгтийг (Size Chart) бөглөх шаардлагатай.</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm p-2.5 rounded-xl border border-border/50">
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-orange-400" />
                        {profile.height_cm}см / {profile.weight_kg}кг
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Verified Profile
                    </div>
                </div>
                <div className="text-[9px] uppercase tracking-tighter text-muted-foreground opacity-60">
                    Smart Fit AI 2.0
                </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};