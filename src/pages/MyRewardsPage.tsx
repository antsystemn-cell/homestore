import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Copy, Ticket, Gift, ArrowLeft, ChevronDown } from "lucide-react";
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

type CouponGroup = {
  key: string;
  coupons: Coupon[];
  reward_type: string;
  reward_value: number;
  minimum_order_amount: number;
  earliestExpiry: number;
};

const TYPE_LABEL: Record<string, string> = {
  coupon_5k: "5,000₮ купон",
  coupon_10k: "10,000₮ купон",
  coupon_50k: "50,000₮ купон",
  gift_select: "Бэлэг сонгох эрх",
  free_gift: "Сүүүүүүпэр бэлэг",
};

function groupCoupons(list: Coupon[]): CouponGroup[] {
  const map = new Map<string, CouponGroup>();
  for (const c of list) {
    const hourBucket = Math.floor(new Date(c.created_at).getTime() / 3_600_000);
    const key = `${c.reward_type}|${c.reward_value}|${c.minimum_order_amount}|${hourBucket}`;
    const existing = map.get(key);
    const exp = new Date(c.expires_at).getTime();
    if (existing) {
      existing.coupons.push(c);
      existing.earliestExpiry = Math.min(existing.earliestExpiry, exp);
    } else {
      map.set(key, {
        key,
        coupons: [c],
        reward_type: c.reward_type,
        reward_value: c.reward_value,
        minimum_order_amount: c.minimum_order_amount,
        earliestExpiry: exp,
      });
    }
  }
  // Preserve creation-desc order roughly by earliest createdAt of newest coupon
  return Array.from(map.values()).sort((a, b) => {
    const aT = Math.max(...a.coupons.map((c) => new Date(c.created_at).getTime()));
    const bT = Math.max(...b.coupons.map((c) => new Date(c.created_at).getTime()));
    return bT - aT;
  });
}

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

  const activeGroups = useMemo(() => {
    const list = coupons.filter((c) => !c.is_used && !c.invalidated_at && new Date(c.expires_at).getTime() > now);
    return groupCoupons(list);
  }, [coupons, now]);

  const inactiveGroups = useMemo(() => {
    const list = coupons.filter((c) => c.is_used || c.invalidated_at || new Date(c.expires_at).getTime() <= now);
    return groupCoupons(list);
  }, [coupons, now]);

  const activeCount = activeGroups.reduce((n, g) => n + g.coupons.length, 0);
  const inactiveCount = inactiveGroups.reduce((n, g) => n + g.coupons.length, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold">Миний шагнал</h1>
        </div>

        {activeCount === 0 && inactiveCount === 0 && (
          <div className="text-center py-16">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Танд шагнал алга байна</p>
            <Button asChild><Link to="/spin">Ёндоогоо үзэх</Link></Button>
          </div>
        )}

        {activeGroups.length > 0 && (
          <>
            <h2 className="text-sm font-semibold mb-2 mt-2">Идэвхтэй ({activeCount})</h2>
            <div className="space-y-3 mb-6">
              {activeGroups.map((g) => <CouponGroupCard key={g.key} group={g} now={now} active />)}
            </div>
          </>
        )}

        {inactiveGroups.length > 0 && (
          <>
            <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Дууссан / Ашигласан</h2>
            <div className="space-y-3">
              {inactiveGroups.map((g) => <CouponGroupCard key={g.key} group={g} now={now} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CouponGroupCard({ group, now, active = false }: { group: CouponGroup; now: number; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const ms = group.earliestExpiry - now;
  const expired = ms <= 0;
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  const m = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  const s = Math.max(0, Math.floor((ms % 60_000) / 1000));
  const urgent = active && ms > 0 && ms < 60 * 60 * 1000;
  const isGift = group.reward_type === "gift_select" || group.reward_type === "free_gift";
  const count = group.coupons.length;
  const isGrouped = count > 1;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Хуулагдлаа");
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${active ? "bg-card" : "bg-muted/30 opacity-70"}`}>
      <div className={`p-4 ${active ? (isGift ? "bg-pink-50 dark:bg-pink-950/20" : "bg-amber-50 dark:bg-amber-950/20") : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isGift ? <Gift className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
              <span className="text-sm font-semibold">{TYPE_LABEL[group.reward_type] || group.reward_type}</span>
              {isGrouped && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  ×{count}
                </span>
              )}
            </div>
            {group.reward_value > 0 && (
              <p className="text-2xl font-bold mt-1">
                {group.reward_value.toLocaleString()}₮
                {isGrouped && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    ({(group.reward_value * count).toLocaleString()}₮ нийт)
                  </span>
                )}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Доод дүн: {group.minimum_order_amount.toLocaleString()}₮
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

      {/* First / only code row */}
      <div className="px-4 py-2 border-t flex items-center justify-between gap-2">
        <button
          className={`font-mono text-sm font-bold flex-1 truncate text-left cursor-pointer select-all active:opacity-70 transition-opacity inline-flex items-center gap-1.5 ${active ? "text-foreground" : "text-muted-foreground"}`}
          onClick={() => copyCode(group.coupons[0].code)}
        >
          {group.coupons[0].code}
          {active && <Copy className="h-3 w-3 opacity-50 flex-shrink-0" />}
        </button>
        {active ? (
          <Button size="sm" asChild><Link to="/cart">Ашиглах</Link></Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {group.coupons[0].is_used ? "Ашигласан" : group.coupons[0].invalidated_at ? "Цуцалсан" : "Хугацаа дууссан"}
          </span>
        )}
      </div>

      {/* Expand additional codes */}
      {isGrouped && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full px-4 py-2 border-t text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-1"
          >
            {open ? "Хураах" : `Бусад ${count - 1} кодыг харах`}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="border-t divide-y">
              {group.coupons.slice(1).map((c) => (
                <div key={c.id} className="px-4 py-2 flex items-center justify-between gap-2">
                  <button
                    className={`font-mono text-sm font-bold flex-1 truncate text-left cursor-pointer select-all active:opacity-70 transition-opacity inline-flex items-center gap-1.5 ${active ? "text-foreground" : "text-muted-foreground"}`}
                    onClick={() => copyCode(c.code)}
                  >
                    {c.code}
                    {active && <Copy className="h-3 w-3 opacity-50 flex-shrink-0" />}
                  </button>
                  {active ? (
                    <Button size="sm" variant="outline" asChild><Link to="/cart">Ашиглах</Link></Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {c.is_used ? "Ашигласан" : c.invalidated_at ? "Цуцалсан" : "Дууссан"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
