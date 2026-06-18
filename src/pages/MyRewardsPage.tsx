import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Copy, Ticket, Gift, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  reward_type: string;
  reward_value: number;
  minimum_order_amount: number;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  invalidated_at: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  coupon_5k: "5,000₮ купон",
  coupon_10k: "10,000₮ купон",
  coupon_50k: "50,000₮ купон",
  gift_select: "Бэлэг сонгох эрх",
  free_gift: "Үнэгүй бэлэг",
};

export default function MyRewardsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    (async () => {
      if (user) {
        const { data } = await supabase
          .from("spin_coupons")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setCoupons((data as Coupon[]) || []);
      } else {
        const { getDeviceFingerprint } = await import("@/lib/deviceFingerprint");
        const fp = getDeviceFingerprint();
        const { data } = await supabase
          .from("spin_coupons")
          .select("*")
          .eq("guest_fingerprint", fp)
          .order("created_at", { ascending: false });
        setCoupons((data as Coupon[]) || []);
      }
    })();
  }, [user, loading]);

  const active = useMemo(
    () => coupons.filter((c) => !c.is_used && !c.invalidated_at && new Date(c.expires_at).getTime() > now),
    [coupons, now],
  );
  const inactive = useMemo(
    () => coupons.filter((c) => c.is_used || c.invalidated_at || new Date(c.expires_at).getTime() <= now),
    [coupons, now],
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold">Миний шагнал</h1>
        </div>

        {active.length === 0 && inactive.length === 0 && (
          <div className="text-center py-16">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Танд шагнал алга байна</p>
            <Button asChild><Link to="/spin">Азаа үзэх</Link></Button>
          </div>
        )}

        {active.length > 0 && (
          <>
            <h2 className="text-sm font-semibold mb-2 mt-2">Идэвхтэй ({active.length})</h2>
            <div className="space-y-3 mb-6">
              {active.map((c) => <CouponCard key={c.id} c={c} now={now} active />)}
            </div>
          </>
        )}

        {inactive.length > 0 && (
          <>
            <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Дууссан / Ашигласан</h2>
            <div className="space-y-3">
              {inactive.map((c) => <CouponCard key={c.id} c={c} now={now} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CouponCard({ c, now, active = false }: { c: Coupon; now: number; active?: boolean }) {
  const ms = new Date(c.expires_at).getTime() - now;
  const expired = ms <= 0;
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  const m = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  const s = Math.max(0, Math.floor((ms % 60_000) / 1000));
  const urgent = active && ms > 0 && ms < 60 * 60 * 1000;
  const isGift = c.reward_type === "gift_select" || c.reward_type === "free_gift";

  return (
    <div className={`border rounded-xl overflow-hidden ${active ? "bg-card" : "bg-muted/30 opacity-70"}`}>
      <div className={`p-4 ${active ? (isGift ? "bg-pink-50 dark:bg-pink-950/20" : "bg-amber-50 dark:bg-amber-950/20") : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {isGift ? <Gift className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
              <span className="text-sm font-semibold">{TYPE_LABEL[c.reward_type] || c.reward_type}</span>
            </div>
            {c.reward_value > 0 && (
              <p className="text-2xl font-bold mt-1">{c.reward_value.toLocaleString()}₮</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Доод дүн: {c.minimum_order_amount.toLocaleString()}₮
            </p>
          </div>
          {active && (
            <div className={`text-right ${urgent ? "text-destructive" : ""}`}>
              <p className="text-[10px]">Дуусах</p>
              <p className={`text-sm font-bold ${urgent ? "animate-pulse" : ""}`}>
                {expired ? "Дууссан" : `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 py-2 border-t flex items-center justify-between gap-2">
        <button
          className={`font-mono text-sm font-bold flex-1 truncate text-left cursor-pointer select-all active:opacity-70 transition-opacity inline-flex items-center gap-1.5 ${active ? "text-foreground" : "text-muted-foreground"}`}
          onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Хуулагдлаа"); }}
        >
          {c.code}
          {active && <Copy className="h-3 w-3 opacity-50 flex-shrink-0" />}
        </button>
        {active ? (
          <Button size="sm" asChild><Link to="/cart">Ашиглах</Link></Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {c.is_used ? "Ашигласан" : c.invalidated_at ? "Цуцалсан" : "Хугацаа дууссан"}
          </span>
        )}
      </div>
    </div>
  );
}
