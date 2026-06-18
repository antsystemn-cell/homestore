import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { executeSpin, REWARD_LABEL, type SpinResult } from "@/lib/spinApi";
import SpinRewardModal from "@/components/spin/SpinRewardModal";

const SEGMENTS: { key: SpinResult["reward_type"]; label: string; from: string; to: string }[] = [
  { key: "coupon_5k",  label: "5,000₮",  from: "#FFB547", to: "#F97316" },
  { key: "coupon_10k", label: "10,000₮", from: "#34D399", to: "#059669" },
  { key: "extra_spin", label: "+1 Эрх",  from: "#60A5FA", to: "#2563EB" },
  { key: "gift_select",label: "Бэлэг",   from: "#F472B6", to: "#DB2777" },
  { key: "coupon_50k", label: "50,000₮", from: "#C084FC", to: "#7C3AED" },
  { key: "free_gift",  label: "Үнэгүй",  from: "#FB7185", to: "#E11D48" },
];

const SEG = 360 / SEGMENTS.length;

export default function SpinWheelPage() {
  const { user } = useAuth();
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

  // Guests are allowed — no auth redirect.

  async function refresh() {
    if (user) {
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
    } else {
      // Guest: lookup by device fingerprint
      const { getDeviceFingerprint } = await import("@/lib/deviceFingerprint");
      const fp = getDeviceFingerprint();
      const { data } = await supabase
        .from("guest_spin_balances")
        .select("available_spins, expires_at")
        .eq("fingerprint", fp)
        .maybeSingle();
      if (data && new Date(data.expires_at).getTime() > Date.now()) {
        setBalance(data.available_spins as number);
        setNextExpiry(data.expires_at);
      } else {
        // No record yet — show 2 free spins as available; server will grant on first spin
        setBalance(2);
        setNextExpiry(null);
      }
      setReferralCode("");
    }
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
      if (code === "no_spins") toast.error("Азаа үзэх эрх дууссан байна");
      else if (code === "verification_required") toast.error("Эхлээд имэйл/утсаа баталгаажуулна уу");
      else toast.error("Алдаа гарлаа. Дахин оролдоно уу.");
    }
  }

  const refLink = referralCode ? `${window.location.origin}/auth?ref=${referralCode}` : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#0f0a1f] to-[#1a0b2e] p-4 pb-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />

      <div className="max-w-md mx-auto relative">
        <h1 className="text-3xl font-extrabold text-center mt-4 mb-1 bg-gradient-to-r from-amber-200 via-pink-200 to-amber-200 bg-clip-text text-transparent tracking-tight">
          ✨ Азаа үзэж хож
        </h1>
        <p className="text-center text-xs text-white/60 mb-6">
          Эрх: <span className="font-semibold text-amber-200">{balance}</span>
          {nextExpiry && balance > 0 && <span className="ml-2">· Дуусах: {expiryText}</span>}
        </p>

        <div className="relative w-[320px] h-[320px] mx-auto mb-8">
          {/* Outer halo */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300/40 via-pink-400/30 to-violet-500/40 blur-2xl scale-110" />

          {/* Bulb ring (decorative dots) */}
          <div className="absolute inset-0 rounded-full">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * 360;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_2px_rgba(252,211,77,0.7)]"
                  style={{
                    transform: `rotate(${angle}deg) translate(0, -158px) translate(-50%, -50%)`,
                    opacity: spinning ? (i % 2 ? 1 : 0.35) : (i % 2 ? 0.9 : 0.5),
                    transition: "opacity 200ms",
                  }}
                />
              );
            })}
          </div>

          {/* Pointer */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
            <div className="relative">
              <div
                className="w-0 h-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                style={{
                  borderLeft: "14px solid transparent",
                  borderRight: "14px solid transparent",
                  borderTop: "26px solid #fbbf24",
                }}
              />
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 border-2 border-white/70 shadow-lg" />
            </div>
          </div>

          {/* Wheel */}
          <div className="absolute inset-3 rounded-full p-[6px] bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_20px_60px_-15px_rgba(251,191,36,0.5)]">
            <div className="w-full h-full rounded-full bg-[#0f0a1f] p-[3px]">
              <svg
                viewBox="-100 -100 200 200"
                className="w-full h-full rounded-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? "transform 4s cubic-bezier(0.17, 0.67, 0.32, 1)"
                    : "none",
                }}
              >
                <defs>
                  {SEGMENTS.map((s, i) => (
                    <linearGradient key={s.key} id={`seg-${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={s.from} />
                      <stop offset="100%" stopColor={s.to} />
                    </linearGradient>
                  ))}
                  <radialGradient id="gloss" cx="50%" cy="30%" r="60%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                    <stop offset="60%" stopColor="white" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {SEGMENTS.map((s, i) => {
                  const a1 = (i * SEG - 90) * (Math.PI / 180);
                  const a2 = ((i + 1) * SEG - 90) * (Math.PI / 180);
                  const r = 98;
                  const x1 = Math.cos(a1) * r;
                  const y1 = Math.sin(a1) * r;
                  const x2 = Math.cos(a2) * r;
                  const y2 = Math.sin(a2) * r;
                  const large = SEG > 180 ? 1 : 0;
                  const path = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                  // label position
                  const am = ((i + 0.5) * SEG - 90) * (Math.PI / 180);
                  const lx = Math.cos(am) * (r * 0.68);
                  const ly = Math.sin(am) * (r * 0.68);
                  const rot = i * SEG + SEG / 2;
                  return (
                    <g key={s.key}>
                      <path d={path} fill={`url(#seg-${i})`} stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
                      <text
                        x={lx}
                        y={ly}
                        transform={`rotate(${rot} ${lx} ${ly})`}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="10"
                        fontWeight="800"
                        fill="white"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
                      >
                        {s.label}
                      </text>
                    </g>
                  );
                })}
                {/* Glossy highlight */}
                <circle cx="0" cy="0" r="98" fill="url(#gloss)" pointerEvents="none" />
              </svg>
            </div>
          </div>

          {/* Center hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[3px] shadow-[0_0_30px_rgba(251,191,36,0.6)]">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a0b2e] to-[#0f0a1f] border-2 border-amber-300/60 flex items-center justify-center">
                <span className="text-amber-200 font-extrabold text-xs tracking-widest">SPIN</span>
              </div>
            </div>
          </div>
        </div>


        <Button
          className="w-full h-14 text-base font-bold rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-[#1a0b2e] hover:opacity-95 shadow-[0_10px_30px_-10px_rgba(251,191,36,0.7)] disabled:opacity-40"
          onClick={handleSpin}
          disabled={spinning || balance < 1}
        >
          {spinning ? "Эргэлдэж байна..." : balance > 0 ? "🎯 Азаа үзэх" : "Эрх дууссан"}
        </Button>

        <div className="mt-3 text-center">
          <Link to="/my-rewards" className="text-xs text-amber-200/80 hover:text-amber-200 underline-offset-2 hover:underline">
            Миний шагналуудыг харах →
          </Link>
        </div>

        {user ? (
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
        ) : (
          <div className="mt-8 p-4 border rounded-xl bg-card text-center">
            <p className="text-sm font-medium">Бүртгүүлбэл 2 эрх + найз бүрийн төлөө 3 эрх</p>
            <Button asChild className="mt-3" size="sm">
              <Link to="/auth?redirect=/spin">Бүртгүүлэх</Link>
            </Button>
          </div>
        )}
      </div>
      <SpinRewardModal open={modalOpen} onClose={() => setModalOpen(false)} result={result} />
    </div>
  );
}
