// Tracks whether the current cart originated from a "buy as bundle" action
// on a specific collection link (e.g. /c/tools). When active AND cart total
// is at or above the threshold, the 8,000₮ delivery surcharge is waived.

const STORAGE_KEY = "easyshop_bundle_free_delivery";
const EVENT = "bundle-free-delivery-change";

export const BUNDLE_FREE_DELIVERY_THRESHOLD = 50000;

export interface BundleFreeDelivery {
  code: string; // collection short_code, e.g. "tools"
  activatedAt: number;
}

export function getBundleFreeDelivery(): BundleFreeDelivery | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setBundleFreeDelivery(code: string) {
  try {
    const payload: BundleFreeDelivery = { code, activatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function clearBundleFreeDelivery() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

// React hook
import { useEffect, useState } from "react";

export function useBundleFreeDelivery(cartTotal: number, itemsCount: number) {
  const [active, setActive] = useState<BundleFreeDelivery | null>(() => getBundleFreeDelivery());

  useEffect(() => {
    const sync = () => setActive(getBundleFreeDelivery());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Auto-clear when cart becomes empty
  useEffect(() => {
    if (itemsCount === 0 && active) {
      clearBundleFreeDelivery();
    }
  }, [itemsCount, active]);

  const eligible = !!active && cartTotal >= BUNDLE_FREE_DELIVERY_THRESHOLD;
  return { active, eligible };
}
