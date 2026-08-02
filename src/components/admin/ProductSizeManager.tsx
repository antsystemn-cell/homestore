import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, SizeMeasurement } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Ruler, Info } from "lucide-react";
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

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Size & Fit Тохиргоо
        </CardTitle>
        <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Хадгалж байна..." : "Хадгалах"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Суналтын түвшин</Label>
                <Select value={stretchLevel} onValueChange={(v: any) => setStretchLevel(v)}>
                    <SelectTrigger>
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
                <Label>Загварын төрөл</Label>
                <Select value={fitType} onValueChange={(v: any) => setFitType(v)}>
                    <SelectTrigger>
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
                <Label className="flex items-center gap-2">
                    Хэмжээний хүснэгт
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </Label>
                <Button onClick={addSizeRow} variant="outline" size="sm" className="h-7">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Мөр нэмэх
                </Button>
            </div>
            
            <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">Хэмжээ</th>
                            <th className="px-3 py-2 text-left font-medium">Цээж (см)</th>
                            <th className="px-3 py-2 text-left font-medium">Бэлхүүс (см)</th>
                            <th className="px-3 py-2 text-left font-medium">Түнх (см)</th>
                            <th className="px-3 py-2 text-left font-medium">Урт (см)</th>
                            <th className="px-3 py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sizeChart.map((s, i) => (
                            <tr key={i}>
                                <td className="px-2 py-1">
                                    <Input value={s.size} onChange={e => updateSizeRow(i, { size: e.target.value })} className="h-8 w-16" placeholder="S" />
                                </td>
                                <td className="px-2 py-1">
                                    <Input type="number" value={s.bust_width || ""} onChange={e => updateSizeRow(i, { bust_width: parseFloat(e.target.value) })} className="h-8" placeholder="45" />
                                </td>
                                <td className="px-2 py-1">
                                    <Input type="number" value={s.waist_width || ""} onChange={e => updateSizeRow(i, { waist_width: parseFloat(e.target.value) })} className="h-8" placeholder="40" />
                                </td>
                                <td className="px-2 py-1">
                                    <Input type="number" value={s.hip_width || ""} onChange={e => updateSizeRow(i, { hip_width: parseFloat(e.target.value) })} className="h-8" placeholder="48" />
                                </td>
                                <td className="px-2 py-1">
                                    <Input type="number" value={s.garment_length || ""} onChange={e => updateSizeRow(i, { garment_length: parseFloat(e.target.value) })} className="h-8" placeholder="60" />
                                </td>
                                <td className="px-2 py-1">
                                    <Button onClick={() => removeSizeRow(i)} variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
