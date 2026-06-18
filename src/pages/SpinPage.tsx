import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { executeSpin, REWARD_LABEL, type SpinResult } from "@/lib/spinApi";
import SpinRewardModal from "@/components/spin/SpinRewardModal";

const SEGMENTS: { key: SpinResult["reward_type"]; label: string; color: string }[] = [
  { key: "coupon_5k", label: "5,000₮", color: "#FBBF24" },
  { key: "coupon_10k", label: "10,000₮", color: "#34D399" },
  { key: "extra_spin", label: "+1 Эрг.", color: "#60A5FA" },
  { key: "gift_select", label: "Бэлэг", color: "#F472B6" },
  { key: "coupon_50k", label: "50,000₮", color: "#A78BFA" },
  { key: "free_gift", label: "Үнэгүй", color: "#F87171" },
];

const SEG = 360 / SEGMENTS.length;

export default function SpinWheelPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [nextExpiry, setNextExpiry] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/spin");
  }, [loading, user, navigate]);

  async function refresh() {
    if (!user) return;
    const [bal, prof] = await Promise.all([
      supabase
        .from("spin_balances")
        .select("available_spins, expires_at")
        .eq("user_id", user.id)
        .gt("available_spins", 0)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true }),
      supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
    ]);
    const total = (bal.data || []).reduce((s, r) => s + (r.available_spins as number), 0);
    setBalance(total);
    setNextExpiry((bal.data && bal.data[0]?.expires_at) || null);
    setReferralCode(prof.data?.referral_code || "");
  }

  useEffect(() => {
    refresh();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const expiryText = useMemo(() => {
    if (!nextExpiry) return "";
    const ms = new Date(nextExpiry).getTime() - now;
    if (ms <= 0) return "Дууссан";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}ц ${m}м ${s}с`;
  }, [nextExpiry, now]);

  async function handleSpin() {
    if (spinning || balance < 1) return;
    setSpinning(true);
    setResult(null);
    try {
      const r = await executeSpin();
      const idx = SEGMENTS.findIndex((s) => s.key === r.reward_type);
      const targetAngle = 360 * 6 + (360 - (idx * SEG + SEG / 2));
      setRotation((prev) => prev + targetAngle);
      setTimeout(() => {
        setResult(r);
        setModalOpen(true);
        setSpinning(false);
        refresh();
      }, 4200);
    } catch (e: unknown) {
      setSpinning(false);
      const code = (e as { code?: string }).code;
      if (code === "no_spins") toast.error("Эргүүлэлтийн эрх дууссан байна");
      else if (code === "verification_required") toast.error("Эхлээд имэйл/утсаа баталгаажуулна уу");
      else toast.error("Алдаа гарлаа. Дахин оролдоно уу.");
    }
  }

  const refLink = referralCode ? `${window.location.origin}/auth?ref=${referralCode}` : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2 mt-4">🎁 Эргүүлж хож!</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Эрх: <span className="font-semibold text-foreground">{balance}</span>
          {nextExpiry && balance > 0 && <span className="ml-2">· Дуусах: {expiryText}</span>}
        </p>

        <div className="relative w-72 h-72 mx-auto mb-6">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
            style={{
              width: 0,
              height: 0,
              borderLeft: "12px solid transparent",
              borderRight: "12px solid transparent",
              borderTop: "20px solid hsl(var(--primary))",
            }}
          />
          <div
            className="w-full h-full rounded-full border-4 border-primary shadow-xl overflow-hidden transition-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: spinning ? "4s" : "0s",
              transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.32, 1)",
              background: `conic-gradient(${SEGMENTS.map(
                (s, i) => `${s.color} ${i * SEG}deg ${(i + 1) * SEG}deg`,
              ).join(", ")})`,
            }}
          >
            {SEGMENTS.map((s, i) => (
              <div
                key={s.key}
                className="absolute left-1/2 top-1/2 origin-top-left text-[11px] font-bold text-white drop-shadow"
                style={{
                  transform: `rotate(${i * SEG + SEG / 2}deg) translate(-50%, -120px)`,
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {s.label}
              </div>
            ))}
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center font-bold">
            SPIN
          </div>
        </div>

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleSpin}
          disabled={spinning || balance < 1}
        >
          {spinning ? "Эргэлдэж байна..." : balance > 0 ? "Эргүүлэх" : "Эрх дууссан"}
        </Button>

        {result && (
          <div className="mt-6 p-4 border rounded-xl bg-card text-center">
            <p className="text-sm text-muted-foreground">Танай шагнал</p>
            <p className="text-xl font-bold mt-1">{REWARD_LABEL[result.reward_type]}</p>
            {result.coupon_code && (
              <>
                <p className="text-sm mt-2">Купон код:</p>
                <p className="font-mono font-bold text-primary">{result.coupon_code}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Доод дүн: {result.minimum_order_amount.toLocaleString()}₮ · 5 цагт хүчинтэй
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-8 p-4 border rounded-xl bg-card">
          <h2 className="font-semibold mb-2">Найзаа урих → +2 эрх</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Найз бүртгүүлээд баталгаажуулахад танд 2 нэмэлт эрх. Хоногт 3 хүртэл.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={refLink}
              className="flex-1 px-3 py-2 text-xs border rounded bg-muted"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(refLink);
                toast.success("Холбоос хуулагдлаа");
              }}
            >
              Хуулах
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
