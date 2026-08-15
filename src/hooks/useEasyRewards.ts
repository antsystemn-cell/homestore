import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type EasyRewardsSummary = {
  enrolled: boolean;
  eligible?: boolean;
  enabled?: boolean;
  referral_code?: string;
  points_balance?: number;
  credit_balance?: number;
  pending_points?: number;
  pending_credit?: number;
  lifetime_points?: number;
  fraud_status?: string;
  phone_verified_at?: string | null;
  point_value_mnt?: number;
  redemption_cap_percent?: number;
  expiring_soon?: { currency: string; amount: number; expires_at: string }[];
};

export type EasyRewardsLedgerEntry = {
  id: string;
  currency: "points" | "credit";
  amount: number;
  status: string;
  reason: string;
  source_type: string;
  order_id: string | null;
  expires_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export const ER_STATUS_LABEL: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  approved: "Баталгаажсан",
  earned: "Цугласан",
  redeemed: "Ашигласан",
  expired: "Хугацаа дууссан",
  reversed: "Буцаагдсан",
  cancelled: "Цуцлагдсан",
  fraud_review: "Шалгагдаж буй",
};

export const ER_SOURCE_LABEL: Record<string, string> = {
  welcome: "Тавтай морил",
  referral_invitee: "Урилгын урамшуулал",
  referral_inviter: "Найз урьсан",
  purchase: "Худалдан авалт",
  daily_login: "Өдөр тутмын нэвтрэлт",
  login_streak: "Дараалсан нэвтрэлт",
  reel_watch: "Reels үзсэн",
  reel_engagement: "Reels үйлдэл",
  review: "Сэтгэгдэл",
  user_video: "Хэрэглэгчийн видео",
  share: "Хуваалцсан",
  weekly_mission: "7 хоногийн даалгавар",
  redemption: "Захиалгад ашигласан",
  admin_adjustment: "Админы залруулга",
};

/** Points -> MNT */
export function erPointsToMnt(points: number, pointValueMnt = 10) {
  return Math.floor(points * pointValueMnt);
}

export function useEasyRewards() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EasyRewardsSummary | null>(null);
  const [ledger, setLedger] = useState<EasyRewardsLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(null);
      setLedger([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: sum }, { data: rows }] = await Promise.all([
      supabase.rpc("er_my_summary" as any),
      supabase
        .from("easy_rewards_ledger" as any)
        .select("id,currency,amount,status,reason,source_type,order_id,expires_at,created_at,metadata")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setSummary((sum as unknown as EasyRewardsSummary) || { enrolled: false });
    setLedger((rows as unknown as EasyRewardsLedgerEntry[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enroll = useCallback(
    async (referralCode?: string) => {
      const { getDeviceFingerprint } = await import("@/lib/deviceFingerprint");
      const { error } = await supabase.rpc("er_enroll" as any, {
        _referral_code: referralCode || null,
        _fingerprint: getDeviceFingerprint(),
      });
      if (!error) await refresh();
      return error;
    },
    [refresh],
  );

  return { summary, ledger, loading, refresh, enroll };
}
