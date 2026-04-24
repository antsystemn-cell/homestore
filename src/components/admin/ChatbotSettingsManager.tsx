import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface Settings {
  bot_name: string;
  greeting_message: string;
  system_prompt: string;
  is_enabled: boolean;
}

const DEFAULTS: Settings = {
  bot_name: "Эйси",
  greeting_message: "Сайн байна уу! Би easyshop.mn-ийн туслах. Танд юугаар туслах вэ?",
  system_prompt:
    "Та easyshop.mn онлайн дэлгүүрийн туслах ажилтан. Монгол хэлээр товч, найрсаг хариу өгнө.",
  is_enabled: true,
};

export default function ChatbotSettingsManager() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chatbot_settings")
        .select("bot_name, greeting_message, system_prompt, is_enabled")
        .eq("id", 1)
        .maybeSingle();
      if (data) setSettings(data);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("chatbot_settings")
      .upsert({ id: 1, ...settings }, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа гарлаа");
      console.error(error);
    } else {
      toast.success("Тохиргоо хадгалагдлаа ✓");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 p-4">
      <div>
        <h2 className="text-xl font-semibold">AI Чатбот тохиргоо</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Сайт дээрх AI туслахын зан төлөв болон харагдалтыг тохируулна.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bot_name">Чатботын нэр</Label>
        <Input
          id="bot_name"
          value={settings.bot_name}
          onChange={(e) => setSettings({ ...settings, bot_name: e.target.value })}
          placeholder="Жнь: Эйси"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="is_enabled" className="text-base">
            Чатбот идэвхтэй эсэх
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Унтраавал чатбот товч сайт дээр харагдахгүй.
          </p>
        </div>
        <Switch
          id="is_enabled"
          checked={settings.is_enabled}
          onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="greeting">Угтах мессеж</Label>
        <Textarea
          id="greeting"
          value={settings.greeting_message}
          onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
          rows={3}
          placeholder="Хэрэглэгч чатыг нээхэд харагдах эхний мессеж"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system_prompt">AI зааварчилгаа (System Prompt)</Label>
        <Textarea
          id="system_prompt"
          value={settings.system_prompt}
          onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          AI яаж хариулах, ямар мэдээлэл өгөх талаарх дэлгэрэнгүй зааварчилгаа.
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
