import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { Gift, Clock, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type WelcomeCoupon = {
  code: string;
  reward_value: number;
  minimum_order_amount: number;
  expires_at: string;
  is_used: boolean;
};

const DISMISS_KEY = "welcome_popup_dismissed";
const BANNER_DISMISS_KEY = "welcome_banner_dismissed";

function msLeft(iso: string) {
  return new Date(iso).getTime() - Date.now();
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "дууссан";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 1) return `${h} цаг ${m} мин`;
  return `${m} мин`;
}

const WelcomeBonus = () => {
  const { user, loading } = useAuth();
  const [coupon, setCoupon] = useState<WelcomeCoupon | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_my_welcome_coupon" as any);
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      const c = row as WelcomeCoupon;
      setCoupon(c);
      const left = msLeft(c.expires_at);
      if (c.is_used || left <= 0) {
        setShowPopup(false);
        setShowBanner(false);
        return;
      }
      const dismissedKey = `${DISMISS_KEY}:${c.code}`;
      if (!localStorage.getItem(dismissedKey)) {
        setShowPopup(true);
      }
      // Banner: show when < 24h left and not dismissed for this code
      if (left < 24 * 3600 * 1000) {
        const bkey = `${BANNER_DISMISS_KEY}:${c.code}`;
        if (!localStorage.getItem(bkey)) setShowBanner(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  // Live countdown tick
  useEffect(() => {
    if (!coupon) return;
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [coupon]);

  const dismissPopup = () => {
    if (coupon) localStorage.setItem(`${DISMISS_KEY}:${coupon.code}`, "1");
    setShowPopup(false);
  };

  const dismissBanner = () => {
    if (coupon) localStorage.setItem(`${BANNER_DISMISS_KEY}:${coupon.code}`, "1");
    setShowBanner(false);
  };

  const copyCode = async () => {
    if (!coupon) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success("Купон код хуулагдлаа");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Хуулж чадсангүй");
    }
  };

  if (!coupon) return null;
  const left = msLeft(coupon.expires_at) - (now - now); // eslint-disable-line
  const remaining = new Date(coupon.expires_at).getTime() - now;
  const under24 = remaining > 0 && remaining < 24 * 3600 * 1000;

  return (
    <>
      {/* Site-wide reminder banner (< 24h) */}
      {showBanner && !coupon.is_used && remaining > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md">
          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg px-4 py-3 flex items-start gap-3">
            <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-bold">Тавтай морил купон дуусах гэж байна!</p>
              <p className="text-xs opacity-90 mt-0.5">
                <span className="font-mono font-bold">{coupon.code}</span> • үлдсэн {fmtCountdown(remaining)}
              </p>
            </div>
            <button
              onClick={dismissBanner}
              className="text-white/80 hover:text-white text-xs font-medium"
              aria-label="Хаах"
            >
              Хаах
            </button>
          </div>
        </div>
      )}

      {/* Welcome popup */}
      <Dialog open={showPopup} onOpenChange={(o) => { if (!o) dismissPopup(); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
              <Gift className="h-8 w-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-white">
                Тавтай морил! 🎉
              </DialogTitle>
              <DialogDescription className="text-white/90 mt-2 text-sm">
                Анхны захиалгадаа <span className="font-bold text-white">{formatPrice(coupon.reward_value)}</span> хямдрал аваарай!
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Купон код</p>
              <p className="text-xl font-mono font-extrabold text-primary select-all">{coupon.code}</p>
              <button
                onClick={copyCode}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Хуулагдлаа" : "Код хуулах"}
              </button>
            </div>

            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                {formatPrice(coupon.minimum_order_amount)}-с дээш захиалгад хүчинтэй
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                Захиалгын төлбөр хийхдээ купон кодоо оруулна уу
              </li>
              <li className={`flex gap-2 ${under24 ? "text-amber-600 font-medium" : ""}`}>
                <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                Хүчинтэй хугацаа: {fmtCountdown(remaining)}
              </li>
            </ul>

            <button
              onClick={dismissPopup}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              Одоо худалдан авах
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WelcomeBonus;
