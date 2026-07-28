import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
}

interface Settings {
  is_enabled: boolean;
  title: string;
  subtitle: string | null;
  image_size: number;
  columns: number;
  show_delay_ms: number;
}

const STORAGE_KEY = "welcome_showcase_seen";

const WelcomeShowcaseModal = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {}

    let cancelled = false;
    (async () => {
      const [s, i] = await Promise.all([
        supabase.from("welcome_showcase_settings" as any).select("*").eq("id", 1).maybeSingle(),
        supabase
          .from("welcome_showcase_items" as any)
          .select("id,image_url,title,subtitle,link_url")
          .eq("is_active", true)
          .order("position", { ascending: true }),
      ]);
      if (cancelled) return;
      const st = (s.data as any) as Settings | null;
      const list = ((i.data as any) || []) as Item[];
      if (!st || !st.is_enabled || list.length === 0) return;
      setSettings(st);
      setItems(list);
      setTimeout(() => setOpen(true), Math.max(0, st.show_delay_ms || 0));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  if (!open || !settings) return null;

  const go = (link: string | null) => {
    close();
    if (link) navigate(link);
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))`,
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Хаах"
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5 pb-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{settings.title}</h2>
          {settings.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{settings.subtitle}</p>
          )}
        </div>

        <div className="p-5">
          <div className="grid gap-3" style={gridStyle}>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => go(item.link_url)}
                className="group text-left"
              >
                <div
                  className="relative w-full rounded-xl overflow-hidden bg-secondary border border-border/60 group-hover:border-primary/40 transition-colors"
                  style={{ height: settings.image_size }}
                >
                  <img
                    src={item.image_url}
                    alt={item.title || ""}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                {(item.title || item.subtitle) && (
                  <div className="mt-1.5">
                    {item.title && (
                      <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                    )}
                    {item.subtitle && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={close}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Дэлгүүр үзэх
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeShowcaseModal;
