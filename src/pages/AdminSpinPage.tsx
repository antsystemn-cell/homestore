import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Cfg = {
  id: number;
  probabilities: Record<string, number>;
  reward_expiry_hours: number;
  spin_expiry_hours: number;
  signup_spins: number;
  referral_spins: number;
  max_active_spins: number;
  daily_referral_cap: number;
  extra_spin_lifetime_cap: number;
};

type GiftRow = {
  id: string;
  product_id: string;
  inventory: number;
  is_active: boolean;
  reward_tier: "gift_select" | "free_gift";
  product?: { name: string };
};

const REWARD_KEYS = ["coupon_5k", "coupon_10k", "extra_spin", "gift_select", "coupon_50k", "free_gift"] as const;
const REWARD_LABEL: Record<string, string> = {
  coupon_5k: "5,000₮ купон", coupon_10k: "10,000₮ купон", extra_spin: "Нэмэлт эрх",
  gift_select: "Бэлэг сонгох", coupon_50k: "50,000₮ купон", free_gift: "Үнэгүй бэлэг",
};

export default function AdminSpinPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [stats, setStats] = useState<{ total: number; byReward: Record<string, number>; coupons: number; couponsUsed: number; refs: number; }>({
    total: 0, byReward: {}, coupons: 0, couponsUsed: 0, refs: 0,
  });
  const [newProductId, setNewProductId] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [loading, user, isAdmin, navigate]);

  async function load() {
    const [c, g, hist, coup, refs] = await Promise.all([
      supabase.from("spin_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("gift_rewards").select("*, product:products(name)").order("created_at", { ascending: false }),
      supabase.from("spin_history").select("reward_type"),
      supabase.from("spin_coupons").select("is_used"),
      supabase.from("referrals").select("status"),
    ]);
    if (c.data) setCfg(c.data as Cfg);
    setGifts((g.data as GiftRow[]) || []);
    const byReward: Record<string, number> = {};
    (hist.data || []).forEach((r) => { byReward[r.reward_type] = (byReward[r.reward_type] || 0) + 1; });
    setStats({
      total: (hist.data || []).length,
      byReward,
      coupons: (coup.data || []).length,
      couponsUsed: (coup.data || []).filter((c) => c.is_used).length,
      refs: (refs.data || []).filter((r) => r.status === "rewarded").length,
    });
  }
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function saveCfg() {
    if (!cfg) return;
    const sum = REWARD_KEYS.reduce((s, k) => s + (Number(cfg.probabilities[k]) || 0), 0);
    if (sum !== 100) { toast.error(`Магадлалын нийлбэр 100 байх ёстой (одоо ${sum})`); return; }
    const { error } = await supabase.from("spin_config").update({
      probabilities: cfg.probabilities,
      reward_expiry_hours: cfg.reward_expiry_hours,
      spin_expiry_hours: cfg.spin_expiry_hours,
      signup_spins: cfg.signup_spins,
      referral_spins: cfg.referral_spins,
      max_active_spins: cfg.max_active_spins,
      daily_referral_cap: cfg.daily_referral_cap,
      extra_spin_lifetime_cap: cfg.extra_spin_lifetime_cap,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Хадгаллаа");
  }

  async function addGift() {
    if (!newProductId.trim()) return;
    const { error } = await supabase.from("gift_rewards").insert({ product_id: newProductId.trim(), inventory: 1, is_active: true, reward_tier: "gift_select" });
    if (error) toast.error(error.message); else { toast.success("Нэмэгдлээ"); setNewProductId(""); load(); }
  }
  async function updateGift(id: string, patch: Partial<GiftRow>) {
    const { error } = await supabase.from("gift_rewards").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  }
  async function delGift(id: string) {
    const { error } = await supabase.from("gift_rewards").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  if (!cfg) return <div className="p-8">Уншиж байна...</div>;

  const probSum = REWARD_KEYS.reduce((s, k) => s + (Number(cfg.probabilities[k]) || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Эргүүлж хож — Удирдах</h1>
        <Button variant="outline" onClick={() => navigate("/admin")}>Буцах</Button>
      </div>

      <section className="border rounded-xl p-4 bg-card">
        <h2 className="font-semibold mb-3">Статистик</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Нийт эргүүлэлт" value={stats.total} />
          <Stat label="Гарсан купон" value={stats.coupons} />
          <Stat label="Ашигласан купон" value={stats.couponsUsed} />
          <Stat label="Урилгаар шагнагдсан" value={stats.refs} />
        </div>
        <div className="mt-4 text-sm">
          <p className="font-medium mb-2">Шагналын тархалт</p>
          <div className="space-y-1">
            {REWARD_KEYS.map((k) => {
              const n = stats.byReward[k] || 0;
              const pct = stats.total ? Math.round((n / stats.total) * 100) : 0;
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-32 text-xs">{REWARD_LABEL[k]}</span>
                  <div className="flex-1 h-3 bg-muted rounded">
                    <div className="h-full bg-primary rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs">{n} ({pct}%)</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Купон ашиглалт: {stats.coupons ? Math.round((stats.couponsUsed / stats.coupons) * 100) : 0}%
          </p>
        </div>
      </section>

      <section className="border rounded-xl p-4 bg-card">
        <h2 className="font-semibold mb-3">Магадлал (нийт 100 байх ёстой) — одоо: {probSum}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {REWARD_KEYS.map((k) => (
            <div key={k}>
              <Label className="text-xs">{REWARD_LABEL[k]} %</Label>
              <Input type="number" min={0} max={100}
                value={cfg.probabilities[k] ?? 0}
                onChange={(e) => setCfg({ ...cfg, probabilities: { ...cfg.probabilities, [k]: Number(e.target.value) } })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-xl p-4 bg-card grid grid-cols-2 md:grid-cols-4 gap-3">
        <NumField label="Бүртгүүлэх эрх" v={cfg.signup_spins} on={(v) => setCfg({ ...cfg, signup_spins: v })} />
        <NumField label="Урилгын эрх" v={cfg.referral_spins} on={(v) => setCfg({ ...cfg, referral_spins: v })} />
        <NumField label="Эрхийн дуусах (ц)" v={cfg.spin_expiry_hours} on={(v) => setCfg({ ...cfg, spin_expiry_hours: v })} />
        <NumField label="Шагналын дуусах (ц)" v={cfg.reward_expiry_hours} on={(v) => setCfg({ ...cfg, reward_expiry_hours: v })} />
        <NumField label="Идэвхтэй эрхийн дээд" v={cfg.max_active_spins} on={(v) => setCfg({ ...cfg, max_active_spins: v })} />
        <NumField label="Хоногт урилгын дээд" v={cfg.daily_referral_cap} on={(v) => setCfg({ ...cfg, daily_referral_cap: v })} />
        <NumField label="Нэмэлт эрхийн насан туршийн дээд" v={cfg.extra_spin_lifetime_cap} on={(v) => setCfg({ ...cfg, extra_spin_lifetime_cap: v })} />
        <div className="col-span-2 md:col-span-4">
          <Button onClick={saveCfg} className="w-full md:w-auto">Хадгалах</Button>
        </div>
      </section>

      <section className="border rounded-xl p-4 bg-card">
        <h2 className="font-semibold mb-3">Бэлэг бараа</h2>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Product ID (UUID)" value={newProductId} onChange={(e) => setNewProductId(e.target.value)} />
          <Button onClick={addGift}>Нэмэх</Button>
        </div>
        <div className="space-y-2">
          {gifts.map((g) => (
            <div key={g.id} className="flex items-center gap-2 p-2 border rounded text-sm">
              <span className="flex-1 truncate">{g.product?.name || g.product_id}</span>
              <select className="border rounded px-2 py-1 text-xs" value={g.reward_tier}
                onChange={(e) => updateGift(g.id, { reward_tier: e.target.value as GiftRow["reward_tier"] })}>
                <option value="gift_select">Сонголт</option>
                <option value="free_gift">Үнэгүй</option>
              </select>
              <Input className="w-20" type="number" value={g.inventory}
                onChange={(e) => updateGift(g.id, { inventory: Number(e.target.value) })} />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={g.is_active}
                  onChange={(e) => updateGift(g.id, { is_active: e.target.checked })} />
                Идэвхтэй
              </label>
              <Button variant="destructive" size="sm" onClick={() => delGift(g.id)}>×</Button>
            </div>
          ))}
          {gifts.length === 0 && <p className="text-sm text-muted-foreground">Бэлэг бараа алга</p>}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 border rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
function NumField({ label, v, on }: { label: string; v: number; on: (n: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={v} onChange={(e) => on(Number(e.target.value))} />
    </div>
  );
}
