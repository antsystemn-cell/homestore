import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, SizeMeasurement } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Ruler, Info, Layers } from "lucide-react";
import { toast } from "sonner";

export const ProductSizeManager = ({ product, onUpdate }: { product: Product, onUpdate: () => void }) => {
  const [sizeChart, setSizeChart] = useState<SizeMeasurement[]>(product.size_chart || []);
  const [stretchLevel, setStretchLevel] = useState(product.stretch_level || 'Medium');
  const [fitType, setFitType] = useState(product.fit_type || 'Regular Fit');
  const [saving, setSaving] = useState(false);

  const addSizeRow = () => {
    setSizeChart([...sizeChart, { size: "" }]);
  };

  const removeSizeRow = (index: number) => {
    setSizeChart(sizeChart.filter((_, i) => i !== index));
  };

  const updateSizeRow = (index: number, patch: Partial<SizeMeasurement>) => {
    const next = [...sizeChart];
    next[index] = { ...next[index], ...patch };
    setSizeChart(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        size_chart: sizeChart as any,
        stretch_level: stretchLevel as any,
        fit_type: fitType as any
      })
      .eq("id", product.id);

    if (error) {
      toast.error("Алдаа гарлаа");
    } else {
      toast.success("Хэмжээний мэдээлэл хадгалагдлаа");
      onUpdate();
    }
    setSaving(false);
  };

  const getProductCategory = () => {
    const name = product.name.toLowerCase();
    const cat = (product.category || "").toLowerCase();
    if (name.includes("bra") || cat.includes("bra")) return 'bra';
    if (name.includes("leggings") || name.includes("pants") || name.includes("өмд") || cat.includes("өмд")) return 'bottom';
    return 'top';
  };

  const productCategory = getProductCategory();

  return (
    <Card className="mt-6 border-orange-100 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between bg-orange-50/50 rounded-t-xl">
        <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
            <Ruler className="h-5 w-5" />
            Size & Fit ({productCategory === 'bra' ? 'Бра' : productCategory === 'bottom' ? 'Өмд' : 'Цамц'})
        </CardTitle>
        <Button onClick={handleSave} disabled={saving} size="sm" className="bg-orange-600 hover:bg-orange-700">
            {saving ? "Хадгалж байна..." : "Хадгалах"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Суналтын түвшин</Label>
                <Select value={stretchLevel} onValueChange={(v: any) => setStretchLevel(v)}>
                    <SelectTrigger className="focus:ring-orange-500">
                        <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Low">Бага (Low)</SelectItem>
                        <SelectItem value="Medium">Дунд (Medium)</SelectItem>
                        <SelectItem value="High">Өндөр (High)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Загварын төрөл</Label>
                <Select value={fitType} onValueChange={(v: any) => setFitType(v)}>
                    <SelectTrigger className="focus:ring-orange-500">
                        <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Slim Fit">Slim Fit</SelectItem>
                        <SelectItem value="Regular Fit">Regular Fit</SelectItem>
                        <SelectItem value="Oversized">Oversized</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                    Хэмжээний хүснэгт (Garment Flat Measurements)
                    <Info className="h-3.5 w-3.5 text-orange-400" />
                </Label>
                <Button onClick={addSizeRow} variant="outline" size="sm" className="h-7 text-orange-600 border-orange-200 hover:bg-orange-50">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Мөр нэмэх
                </Button>
            </div>
            
            <div className="border border-orange-100 rounded-lg overflow-hidden shadow-inner bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-orange-50/50">
                        <tr>
                            <th className="px-3 py-2.5 text-left font-bold text-orange-900 text-[10px] uppercase">Хэмжээ</th>
                            <th className={`px-3 py-2.5 text-left font-bold text-orange-900 text-[10px] uppercase ${productCategory === 'bottom' ? 'opacity-30' : ''}`}>Цээж (см)</th>
                            <th className={`px-3 py-2.5 text-left font-bold text-orange-900 text-[10px] uppercase ${productCategory === 'bra' ? 'opacity-30' : ''}`}>Бэлхүүс (см)</th>
                            <th className={`px-3 py-2.5 text-left font-bold text-orange-900 text-[10px] uppercase ${productCategory === 'top' ? 'opacity-30' : ''}`}>Түнх (см)</th>
                            <th className="px-3 py-2.5 text-left font-bold text-orange-900 text-[10px] uppercase">Урт (см)</th>
                            <th className="px-3 py-2.5 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-50">
                        {sizeChart.map((s, i) => (
                            <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                                <td className="px-2 py-1.5">
                                    <Input value={s.size} onChange={e => updateSizeRow(i, { size: e.target.value })} className="h-8 w-16 border-orange-100 focus-visible:ring-orange-500" placeholder="S" />
                                </td>
                                <td className="px-2 py-1.5">
                                    <Input 
                                        type="number" 
                                        value={s.bust_width || ""} 
                                        onChange={e => updateSizeRow(i, { bust_width: parseFloat(e.target.value) })} 
                                        className={`h-8 border-orange-100 focus-visible:ring-orange-500 ${productCategory === 'bottom' ? 'opacity-50 bg-muted/20' : ''}`} 
                                        placeholder="45" 
                                    />
                                </td>
                                <td className="px-2 py-1.5">
                                    <Input 
                                        type="number" 
                                        value={s.waist_width || ""} 
                                        onChange={e => updateSizeRow(i, { waist_width: parseFloat(e.target.value) })} 
                                        className={`h-8 border-orange-100 focus-visible:ring-orange-500 ${productCategory === 'bra' ? 'opacity-50 bg-muted/20' : ''}`} 
                                        placeholder="40" 
                                    />
                                </td>
                                <td className="px-2 py-1.5">
                                    <Input 
                                        type="number" 
                                        value={s.hip_width || ""} 
                                        onChange={e => updateSizeRow(i, { hip_width: parseFloat(e.target.value) })} 
                                        className={`h-8 border-orange-100 focus-visible:ring-orange-500 ${productCategory === 'top' ? 'opacity-50 bg-muted/20' : ''}`} 
                                        placeholder="48" 
                                    />
                                </td>
                                <td className="px-2 py-1.5">
                                    <Input type="number" value={s.garment_length || ""} onChange={e => updateSizeRow(i, { garment_length: parseFloat(e.target.value) })} className="h-8 border-orange-100 focus-visible:ring-orange-500" placeholder="60" />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                    <Button onClick={() => removeSizeRow(i)} variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-red-50">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sizeChart.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-xs italic bg-muted/10">
                        Хэмжээний хүснэгт хоосон байна. "Мөр нэмэх" товч дарж хэмжээ оруулна уу.
                    </div>
                )}
            </div>
        </div>

        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-start gap-2.5">
            <Layers className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-[10px] text-blue-700 leading-normal">
                <span className="font-bold">Санамж:</span> Барааны өргөнийг (Flat measurement) оруулаарай. Хэмжээ авах алгоритм үүнийг 2-оор үржүүлж тойргийн хэмжээг бодож гаргадаг. Жишээ: Өмдний түнхний өргөн 45см бол алгоритм 90см-ийн түнхний тойрогтой хэрэглэгчид санал болгоно.
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
