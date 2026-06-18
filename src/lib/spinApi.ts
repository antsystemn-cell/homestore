import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "jiqjebbxcwetakdhfuel";
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
    "x-device-fingerprint": getDeviceFingerprint(),
  };
}

export type SpinResult = {
  reward_type: "coupon_5k" | "coupon_10k" | "extra_spin" | "gift_select" | "coupon_50k" | "free_gift";
  reward_value: number;
  minimum_order_amount: number;
  coupon_code: string | null;
  gift_product_id: string | null;
  expires_at: string;
};

export async function executeSpin(): Promise<SpinResult> {
  const res = await fetch(`${BASE}/spin-execute`, {
    method: "POST",
    headers: await authHeaders(),
    body: "{}",
  });
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.error || "spin_failed"), { code: json.error });
  return json as SpinResult;
}


export async function applyCoupon(code: string, orderTotal: number) {
  const res = await fetch(`${BASE}/coupon-apply`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ code, order_total: orderTotal }),
  });
  return res.json();
}

export const REWARD_LABEL: Record<SpinResult["reward_type"], string> = {
  coupon_5k: "5,000₮ купон",
  coupon_10k: "10,000₮ купон",
  extra_spin: "Дахин эргүүлэх эрх",
  gift_select: "Бэлэг сонгох эрх",
  coupon_50k: "50,000₮ купон",
  free_gift: "Үнэгүй бэлэг",
};
