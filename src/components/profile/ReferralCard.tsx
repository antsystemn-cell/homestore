import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function ReferralCard({ userId }: { userId: string }) {
  const [code, setCode] = useState<string>("");
  const [count, setCount] = useState<number>(0);
  const [rewardedCount, setRewardedCount] = useState<number>(0);
  const [referralSpins, setReferralSpins] = useState<number>(3);

  useEffect(() => {
    (async () => {
      const [profRes, refsRes, cfgRes] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("user_id", userId).maybeSingle(),
        supabase.from("referrals").select("status").eq("referrer_id", userId),
        supabase.from("spin_config").select("referral_spins").eq("id", 1).maybeSingle(),
      ]);
      const prof = profRes.data as { referral_code: string | null } | null;
      const refs = (refsRes.data as Array<{ status: string }> | null) || [];
      const cfg = cfgRes.data as { referral_spins: number } | null;
      setCode(prof?.referral_code || "");
      setCount(refs.length);
      setRewardedCount(refs.filter((r) => r.status === "rewarded").length);
      if (cfg?.referral_spins) setReferralSpins(cfg.referral_spins);
    })();
  }, [userId]);

  const refLink = code ? `${window.location.origin}/auth?ref=${code}` : "";

  const copy = async (text: string, label = "Хуулагдлаа") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Хуулж чадсангүй");
    }
  };

  const share = async () => {
    if (!refLink) return;
    const text = `EasyShop-д бүртгүүлээд бэлэг ав! ${refLink}`;
    if (navigator.share) {
      try { await navigator.share({ title: "EasyShop урилга", text, url: refLink }); }
      catch { /* user cancelled */ }
    } else {
      copy(refLink, "Холбоос хуулагдлаа");
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("referral-qr-svg") as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `easyshop-referral-${code}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!code) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
        Урилгын код үүсэж байна...
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5 md:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Gift className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-base">Найзаа урих</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Найз тань уг холбоосоор бүртгүүлэхэд та <span className="font-semibold text-primary">{referralSpins} эрх</span> авна
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-white p-3 rounded-xl border border-border shrink-0">
          <QRCodeSVG
            id="referral-qr-svg"
            value={refLink}
            size={140}
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="flex-1 w-full space-y-2">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Урилгын код</p>
            <button
              onClick={() => copy(code, "Код хуулагдлаа")}
              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition"
            >
              <span className="font-mono font-bold text-sm tracking-wider">{code}</span>
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Холбоос</p>
            <button
              onClick={() => copy(refLink, "Холбоос хуулагдлаа")}
              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition"
            >
              <span className="text-xs truncate">{refLink}</span>
              <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={share} className="flex-1 gap-2" size="sm">
          <Share2 className="h-4 w-4" />
          Хуваалцах
        </Button>
        <Button onClick={downloadQR} variant="outline" size="sm" className="gap-2">
          QR татах
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <div className="text-center p-2 rounded-lg bg-secondary/40">
          <p className="text-[10px] text-muted-foreground">Урьсан</p>
          <p className="font-bold text-lg">{count}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-primary/5">
          <p className="text-[10px] text-muted-foreground">Шагнал авсан</p>
          <p className="font-bold text-lg text-primary">{rewardedCount}</p>
        </div>
      </div>
    </div>
  );
}
