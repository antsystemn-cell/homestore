import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Share2, Users, Gift, Check, Info, ChevronDown } from "lucide-react";
import { toast } from "sonner";

type Stats = { invited_count: number; completed_count: number; pending_count: number; referral_code: string | null };

const ReferralCard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_my_referral_stats" as any);
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setStats(row as any);
    })();
  }, []);

  const code = stats?.referral_code || "";
  const link = code ? `${window.location.origin}/?ref=${encodeURIComponent(code)}` : "";
  const shareText = `EasyShop-д намайг дагаад бүртгүүлээрэй! Эхний захиалгадаа 10% хямдрал авах код: ${code}\n${link}`;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Линк хуулагдлаа");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Хуулж чадсангүй");
    }
  };

  const share = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "EasyShop урилга", text: shareText, url: link });
        return;
      } catch { /* fall through */ }
    }
    copy();
  };

  const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(link)}`;
  const messengerFallback = `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${encodeURIComponent(link)}&redirect_uri=${encodeURIComponent(window.location.href)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="rounded-2xl p-4 md:p-5 bg-card border border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Gift className="h-4 w-4" />
        Найзаа урих
      </div>
      <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
        Урьсан найз бүрийн эхний захиалга дуусахад та <b className="text-foreground">10,000₮</b> купон авна. Уригдсан найз эхний захиалгадаа <b className="text-foreground">10% хямдрал</b> автоматаар авна.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 min-w-0 rounded-xl bg-secondary px-3 py-2 text-sm font-mono truncate">
          {code || "..."}
        </div>
        <button onClick={copy} className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold inline-flex items-center gap-1">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Хуулах
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <button
          onClick={share}
          className="rounded-xl border border-border py-2 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
        >
          <Share2 className="h-3.5 w-3.5" />
          Хуваалцах
        </button>
        <a
          href={messengerUrl}
          onClick={(e) => {
            // Attempt native app; fallback to web dialog after short delay
            setTimeout(() => { window.open(messengerFallback, "_blank"); }, 400);
          }}
          className="rounded-xl border border-border py-2 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
        >
          Messenger
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-border py-2 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
        >
          WhatsApp
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-xl bg-secondary/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" /> Урьсан
          </div>
          <div className="text-lg font-bold">{stats?.invited_count ?? 0}</div>
        </div>
        <div className="rounded-xl bg-secondary/60 p-2.5 text-center">
          <div className="text-[10px] text-muted-foreground">Хүлээгдэж буй</div>
          <div className="text-lg font-bold">{stats?.pending_count ?? 0}</div>
        </div>
        <div className="rounded-xl bg-primary/10 text-primary p-2.5 text-center">
          <div className="text-[10px] opacity-80">Урамшуулал авсан</div>
          <div className="text-lg font-bold">{stats?.completed_count ?? 0}</div>
        </div>
      </div>
    </div>
  );
};

export default ReferralCard;
