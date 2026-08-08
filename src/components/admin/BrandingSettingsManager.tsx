import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Globe, Image as ImageIcon, Upload, Loader2, Save, Trash2 } from "lucide-react";
import { optimizeImage } from "@/lib/imageOptimize";

export const BrandingSettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<any>({
    site_title: "EasyShop",
    site_description: "Амьдралын Style",
    favicon_url: "",
    og_image_url: "",
    logo_url: ""
  });

  const faviconRef = useRef<HTMLInputElement>(null);
  const ogImageRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_branding")
        .select("*")
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setBranding(data);
      }
    } catch (error) {
      console.error("Error fetching branding:", error);
      toast.error("Тохиргоог татахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("site_branding")
        .upsert({
          id: "00000000-0000-0000-0000-000000000000",
          ...branding,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("Вэб сайтын тохиргоо амжилттай хадгалагдлаа");
    } catch (error) {
      console.error("Error saving branding:", error);
      toast.error("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await optimizeImage(file, 800, 0.8);
      setBranding((prev: any) => ({ ...prev, [field]: base64 }));
      toast.success("Зураг амжилттай ачаалагдлаа");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Зураг боловсруулахад алдаа гарлаа");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Вэб сайтын танилцуулга & Branding</h2>
          <p className="text-muted-foreground">
            Google хайлт болон сошиал сүлжээнд харагдах мэдээллийг эндээс тохируулна.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Хадгалах
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              SEO Тохиргоо
            </CardTitle>
            <CardDescription>
              Google болон бусад хайлтын системд харагдах гарчиг, тайлбар.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_title">Вэб сайтын нэр (Title)</Label>
              <Input
                id="site_title"
                value={branding.site_title}
                onChange={(e) => setBranding({ ...branding, site_title: e.target.value })}
                placeholder="Жишээ: EasyShop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_description">Вэб сайтын тайлбар (Description)</Label>
              <Textarea
                id="site_description"
                rows={4}
                value={branding.site_description}
                onChange={(e) => setBranding({ ...branding, site_description: e.target.value })}
                placeholder="Вэб сайтынхаа тухай товч тайлбар бичнэ үү..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-emerald-500" />
              Лого & Favicon
            </CardTitle>
            <CardDescription>
              Вэб сайтын таних тэмдэгүүд.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Favicon (32x32 эсвэл 192x192)</Label>
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {branding.favicon_url ? (
                    <img src={branding.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="h-6 w-6 text-muted-foreground opacity-20" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    ref={faviconRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "favicon_url")}
                  />
                  <Button variant="outline" size="sm" onClick={() => faviconRef.current?.click()} className="w-full gap-2">
                    <Upload className="h-4 w-4" />
                    Солих
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    Браузерын таб дээр харагдах жижиг дүрс.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t">
              <Label>Үндсэн Лого</Label>
              <div className="flex items-start gap-4">
                <div className="h-16 w-32 rounded border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground opacity-20" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    ref={logoRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "logo_url")}
                  />
                  <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()} className="w-full gap-2">
                    <Upload className="h-4 w-4" />
                    Солих
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Сошиал Shared Image (OG Image)</CardTitle>
          <CardDescription>
            Линк хуваалцахад (Facebook, Telegram) харагдах зураг. Зөвлөмж хэмжээ: 1200x630
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video w-full max-w-2xl rounded-lg border bg-muted flex items-center justify-center overflow-hidden relative group">
            {branding.og_image_url ? (
              <img src={branding.og_image_url} alt="OG" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto opacity-20 mb-2" />
                <p className="text-sm text-muted-foreground">Зураг оруулаагүй байна</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => ogImageRef.current?.click()}>
                Зураг сонгох
              </Button>
              {branding.og_image_url && (
                <Button size="sm" variant="destructive" onClick={() => setBranding({ ...branding, og_image_url: "" })}>
                  Устгах
                </Button>
              )}
            </div>
            <input
              type="file"
              ref={ogImageRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "og_image_url")}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 py-3">
          <p className="text-xs text-muted-foreground">
            * Хадгалсны дараа Google эсвэл Facebook дээр шинэчлэгдэхэд хэсэг хугацаа (cache) шаардагдаж магадгүй.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
