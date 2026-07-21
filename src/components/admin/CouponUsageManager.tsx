import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type UsedCoupon = {
  id: string; code: string; user_id: string | null;
  user_email: string | null; user_name: string | null;
  reward_type: string; reward_value: number; minimum_order_amount: number;
  used_at: string | null; created_at: string; expires_at: string;
  used_order_id: string | null; order_ref: string | null; order_total: number | null;
  source: string;
};

type SpinWinner = {
  id: string; user_id: string | null;
  user_email: string | null; user_name: string | null;
  reward_type: string; reward_value: number;
  coupon_id: string | null; coupon_code: string | null; coupon_used: boolean | null;
  gift_product_id: string | null; gift_product_name: string | null;
  created_at: string;
};

const formatReward = (type: string, value: number) => {
  if (type === "percent") return `${value}%`;
  if (type === "gift" || type === "product") return "Бэлэг";
  return formatPrice(value);
};

const sourceLabel = (s: string) => ({
  welcome: "Тавтай морил", referral_inviter: "Уригчид",
  referral_invitee: "Уригдсан", wheel: "Хүрд", other: "Бусад",
} as Record<string, string>)[s] || s;

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString("mn-MN") : "-";

export default function CouponUsageManager() {
  const [used, setUsed] = useState<UsedCoupon[]>([]);
  const [winners, setWinners] = useState<SpinWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, b] = await Promise.all([
        supabase.rpc("admin_list_used_coupons", { _limit: 500 }),
        supabase.rpc("admin_list_spin_winners", { _limit: 500 }),
      ]);
      if (a.error) toast.error("Купон ачаалж чадсангүй"); else setUsed((a.data || []) as UsedCoupon[]);
      if (b.error) toast.error("Хожил ачаалж чадсангүй"); else setWinners((b.data || []) as SpinWinner[]);
      setLoading(false);
    })();
  }, []);

  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase().trim());
  const usedFiltered = q ? used.filter(x =>
    match(x.code || "") || match(x.user_email || "") || match(x.user_name || "") || match(x.order_ref || "")
  ) : used;
  const winnersFiltered = q ? winners.filter(x =>
    match(x.coupon_code || "") || match(x.user_email || "") || match(x.user_name || "") || match(x.gift_product_name || "")
  ) : winners;

  const totalDiscount = used
    .filter(x => x.reward_type !== "percent")
    .reduce((s, x) => s + Number(x.reward_value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Купон ашигласан / Хожсон хэрэглэгчид</h2>
          <p className="text-sm text-muted-foreground">
            Ашигласан купон: <strong>{used.length}</strong> · Нийт хямдрал: <strong>{formatPrice(totalDiscount)}</strong> · Хүрдний хожил: <strong>{winners.length}</strong>
          </p>
        </div>
        <Input
          placeholder="Хайх (код, нэр, имэйл, захиалга)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Tabs defaultValue="used">
        <TabsList>
          <TabsTrigger value="used">Ашигласан купонууд ({usedFiltered.length})</TabsTrigger>
          <TabsTrigger value="winners">Хүрдний хожигчид ({winnersFiltered.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="used" className="mt-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2">Огноо</th>
                  <th className="p-2">Хэрэглэгч</th>
                  <th className="p-2">Купон</th>
                  <th className="p-2">Төрөл</th>
                  <th className="p-2">Хямдрал</th>
                  <th className="p-2">Захиалга</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td className="p-4 text-center" colSpan={6}>Ачаалж байна...</td></tr>}
                {!loading && usedFiltered.length === 0 && (
                  <tr><td className="p-4 text-center text-muted-foreground" colSpan={6}>Ашигласан купон алга</td></tr>
                )}
                {usedFiltered.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{fmtDate(c.used_at)}</td>
                    <td className="p-2">
                      <div className="font-medium">{c.user_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.user_email || (c.user_id ? c.user_id.slice(0,8) : "Зочин")}</div>
                    </td>
                    <td className="p-2 font-mono text-xs">{c.code}</td>
                    <td className="p-2"><Badge variant="secondary">{sourceLabel(c.source)}</Badge></td>
                    <td className="p-2 font-semibold">{formatReward(c.reward_type, Number(c.reward_value))}</td>
                    <td className="p-2">
                      {c.order_ref ? (
                        <div>
                          <div className="font-mono text-xs">{c.order_ref}</div>
                          <div className="text-xs text-muted-foreground">{formatPrice(Number(c.order_total || 0))}</div>
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="winners" className="mt-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2">Огноо</th>
                  <th className="p-2">Хэрэглэгч</th>
                  <th className="p-2">Шагнал</th>
                  <th className="p-2">Купон код</th>
                  <th className="p-2">Ашигласан эсэх</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td className="p-4 text-center" colSpan={5}>Ачаалж байна...</td></tr>}
                {!loading && winnersFiltered.length === 0 && (
                  <tr><td className="p-4 text-center text-muted-foreground" colSpan={5}>Хожил алга</td></tr>
                )}
                {winnersFiltered.map((w) => (
                  <tr key={w.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{fmtDate(w.created_at)}</td>
                    <td className="p-2">
                      <div className="font-medium">{w.user_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{w.user_email || (w.user_id ? w.user_id.slice(0,8) : "-")}</div>
                    </td>
                    <td className="p-2 font-semibold">
                      {w.gift_product_name
                        ? `🎁 ${w.gift_product_name}`
                        : formatReward(w.reward_type, Number(w.reward_value))}
                    </td>
                    <td className="p-2 font-mono text-xs">{w.coupon_code || "—"}</td>
                    <td className="p-2">
                      {w.coupon_code == null ? <span className="text-muted-foreground">—</span>
                        : w.coupon_used ? <Badge>Ашигласан</Badge>
                        : <Badge variant="outline">Ашиглаагүй</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
