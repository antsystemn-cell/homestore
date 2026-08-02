import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ruler, Check, AlertCircle, Sparkles, ChevronRight, User } from "lucide-react";
import { toast } from "sonner";

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

export const ProductSizeFit = ({ product }: { product: Product }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SizeResult | null>(null);

  // Form state
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [shape, setShape] = useState<'Slim' | 'Regular' | 'Curvy' | 'Athletic'>('Regular');
  const [fit, setFit] = useState<'Tight' | 'Regular' | 'Loose'>('Regular');

  const normalizedBrand = (product.brandName || "").toLowerCase().replace(/\s+/g, "");
  const isElleSport = normalizedBrand.includes("elle") && normalizedBrand.includes("sport");

  // Only show for Elle Sport or clothing categories
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
        // Fallback logic if no size chart
        setResult(null);
        return;
    }

    // Advanced sizing logic
    const scores = product.size_chart.map(s => {
        let score = 0;
        let diffs = [];
        
        // Weight bust heavily for bras/tops, hips for leggings
        const isBottom = product.name.toLowerCase().includes("leggings") || product.name.toLowerCase().includes("pants");
        
        if (s.bust_width && profileData.bust_cm) {
            const bustTarget = s.bust_width * 2; // Garment width to circumference
            const diff = Math.abs(bustTarget - profileData.bust_cm);
            score += diff * (isBottom ? 0.5 : 2);
            diffs.push(diff);
        }
        
        if (s.waist_width && profileData.waist_cm) {
            const waistTarget = s.waist_width * 2;
            const diff = Math.abs(waistTarget - profileData.waist_cm);
            score += diff * 1.5;
            diffs.push(diff);
        }
        
        if (s.hip_width && profileData.hip_cm) {
            const hipTarget = s.hip_width * 2;
            const diff = Math.abs(hipTarget - profileData.hip_cm);
            score += diff * (isBottom ? 2 : 0.5);
            diffs.push(diff);
        }

        // Adjust for stretch
        if (product.stretch_level === 'High') score *= 0.8;
        if (product.stretch_level === 'Low') score *= 1.2;

        return { size: s.size, score };
    });

    scores.sort((a, b) => a.score - b.score);
    const best = scores[0];
    const second = scores[1];

    setResult({
        recommended: best.size,
        confidence: Math.max(70, Math.min(99, 100 - best.score)),
        alternative: second?.size,
        reasoning: `Таны биеийн хэмжээ болон энэхүү барааны загварт үндэслэн ${best.size} хэмжээ хамгийн сайн тохирно.`
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    const profileData = {
      user_id: user.id,
      height_cm: parseFloat(height),
      weight_kg: parseFloat(weight),
      bust_cm: parseFloat(bust),
      waist_cm: parseFloat(waist),
      hip_cm: parseFloat(hip),
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

  if (!isClothing) return null;
  if (loading) return <div className="animate-pulse h-24 bg-secondary rounded-xl" />;

  return (
    <Card className="border-none shadow-sm bg-secondary/30 overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Find My Size</CardTitle>
        </div>
        {!isEditing && profile && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-xs h-7 px-2">
                Засах
            </Button>
        )}
      </CardHeader>
      
      <CardContent className="pb-4">
        {!profile || isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Өндөр (см)</Label>
                    <Input value={height} onChange={e => setHeight(e.target.value)} type="number" placeholder="165" className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Жин (кг)</Label>
                    <Input value={weight} onChange={e => setWeight(e.target.value)} type="number" placeholder="55" className="h-9" />
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Цээж (см)</Label>
                    <Input value={bust} onChange={e => setBust(e.target.value)} type="number" placeholder="85" className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Бэлхүүс (см)</Label>
                    <Input value={waist} onChange={e => setWaist(e.target.value)} type="number" placeholder="65" className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Түнх (см)</Label>
                    <Input value={hip} onChange={e => setHip(e.target.value)} type="number" placeholder="90" className="h-9" />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground">Биеийн галбир</Label>
                <RadioGroup value={shape} onValueChange={(v: any) => setShape(v)} className="flex flex-wrap gap-2">
                    {['Slim', 'Regular', 'Curvy', 'Athletic'].map(s => (
                        <div key={s} className="flex items-center space-x-1">
                            <RadioGroupItem value={s} id={`shape-${s}`} className="sr-only" />
                            <Label 
                                htmlFor={`shape-${s}`} 
                                className={`px-3 py-1.5 rounded-full text-[10px] border cursor-pointer transition-colors ${shape === s ? 'bg-orange-500 text-white border-orange-500' : 'bg-card'}`}
                            >
                                {s === 'Slim' ? 'Турханхай' : s === 'Regular' ? 'Энгийн' : s === 'Curvy' ? 'Мариалаг' : 'Тамирчин'}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 h-10">
                {saving ? "Хадгалж байна..." : "Хэмжээ тооцоолох"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {result ? (
                <div className="bg-card rounded-xl p-4 border border-orange-500/20 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                        <Sparkles className="h-4 w-4 text-orange-400 opacity-50" />
                    </div>
                    
                    <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs text-muted-foreground font-medium">Санал болгож буй хэмжээ:</span>
                        <div className="bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            {result.confidence}% Match
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="text-4xl font-black text-orange-500 tracking-tighter">{result.recommended}</div>
                        <div className="flex-1">
                            <p className="text-[11px] leading-tight text-muted-foreground italic">
                                "{result.reasoning}"
                            </p>
                        </div>
                    </div>

                    {result.alternative && (
                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Сул өмсөх бол:</span>
                            <span className="text-xs font-bold">{result.alternative}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-2 p-3 bg-card rounded-xl border border-dashed text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-[10px]">Энэ бараанд хэмжээний хүснэгт ороогүй байна.</span>
                </div>
            )}

            <div className="flex items-center gap-4 text-[10px] text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {profile.height_cm}/{profile.weight_kg}
                </div>
                <div className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-500" />
                    Verified Fit
                </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
