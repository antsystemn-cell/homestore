import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WalletCredit = {
  id: string;
  user_id: string;
  credit_type: "referral" | "welcome" | "wheel" | "manual";
  value_type: "fixed" | "percent";
  value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  status: "active" | "used" | "expired";
  expires_at: string | null;
  used_at: string | null;
  order_id: string | null;
  source_coupon_id: string | null;
  note: string | null;
  created_at: string;
};

/** Discount amount a given credit would provide against a subtotal. Returns 0 if not eligible. */
export function computeCreditDiscount(c: WalletCredit, subtotal: number): number {
  if (c.status !== "active") return 0;
  if (c.expires_at && new Date(c.expires_at) < new Date()) return 0;
  if (subtotal < Number(c.min_order_amount || 0)) return 0;
  let d = 0;
  if (c.value_type === "fixed") {
    d = Number(c.value);
  } else {
    d = Math.floor((subtotal * Number(c.value)) / 100);
    if (c.max_discount_amount) d = Math.min(d, Number(c.max_discount_amount));
  }
  return Math.max(0, Math.min(d, subtotal));
}

/** Given a list of credits, pick the one that yields the largest discount for a subtotal. */
export function pickBestCredit(credits: WalletCredit[], subtotal: number): WalletCredit | null {
  let best: WalletCredit | null = null;
  let bestVal = 0;
  for (const c of credits) {
    const d = computeCreditDiscount(c, subtotal);
    if (d > bestVal) { best = c; bestVal = d; }
  }
  return best;
}

export function useMyWalletCredits() {
  const [credits, setCredits] = useState<WalletCredit[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_my_wallet_credits" as any);
    setCredits((data as WalletCredit[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { credits, loading, reload };
}
