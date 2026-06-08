import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";

const DeliveryPortal = () => {
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = async () => {
    setLoading(true);
    setError(null);
    setPortalUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("partner-portal-session", {
        body: {},
      });
      if (error) throw error;
      if (!data?.ok || !data?.portal_url) {
        throw new Error(data?.error || "Портал линк ирсэнгүй");
      }
      setPortalUrl(data.portal_url);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Сессийн токен авч чадсангүй");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSession();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Хүргэлтийн порталыг ачаалж байна...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <button
          onClick={loadSession}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" /> Дахин оролдох
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          ON Shop хүргэлтийн портал · сесс 12 цаг хүчинтэй
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSession}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Сэргээх
          </button>
          {portalUrl && (
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Шинэ цонхонд
            </a>
          )}
        </div>
      </div>
      {portalUrl && (
        <iframe
          src={portalUrl}
          className="w-full rounded-2xl border border-border bg-white"
          style={{ height: "85vh" }}
          allow="clipboard-write"
          title="Хүргэлт удирдах"
        />
      )}
    </div>
  );
};

export default DeliveryPortal;
