import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Gift, Trophy, TrendingUp } from "lucide-react";

type Row = {
  inviter_user_id: string;
  full_name: string | null;
  email: string | null;
  referral_code: string | null;
  invited_count: number;
  completed_count: number;
  last_invite_at: string | null;
};

type Summary = {
  total_invites: number;
  total_completed: number;
  total_inviters: number;
  total_reward_amount: number;
};

const ReferralManager = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: lb }, { data: s }] = await Promise.all([
        supabase.rpc("admin_referral_leaderboard" as any, { _limit: 200 }),
        supabase.rpc("admin_referral_summary" as any),
      ]);
      setRows((lb as any) || []);
      const srow = Array.isArray(s) ? (s as any)[0] : s;
      setSummary((srow as any) || null);
      setLoading(false);
    })();
  }, []);

  const Stat = ({ icon: Icon, label, value }: any) => (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="Нийт урилга" value={summary?.total_invites ?? 0} />
        <Stat icon={Gift} label="Урамшуулалтай" value={summary?.total_completed ?? 0} />
        <Stat icon={Trophy} label="Урьсан хүн" value={summary?.total_inviters ?? 0} />
        <Stat icon={TrendingUp} label="Нийт олгосон купон" value={`${(summary?.total_reward_amount ?? 0).toLocaleString("mn-MN")}₮`} />
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold text-sm">
          Топ уригчид
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground text-center">Уншиж байна...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">Одоохондоо урилга үүсээгүй байна</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">#</th>
                  <th className="text-left px-4 py-2 font-medium">Хэрэглэгч</th>
                  <th className="text-left px-4 py-2 font-medium">Код</th>
                  <th className="text-right px-4 py-2 font-medium">Урьсан</th>
                  <th className="text-right px-4 py-2 font-medium">Захиалга хийсэн</th>
                  <th className="text-right px-4 py-2 font-medium">Сүүлд</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.inviter_user_id} className="border-t border-border">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email || ""}</div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.referral_code || "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.invited_count}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-primary font-semibold">{r.completed_count}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      {r.last_invite_at ? new Date(r.last_invite_at).toLocaleDateString("mn-MN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralManager;
