import { useEffect, useState } from "react";
import { subscribeProductStat, ProductStat } from "@/lib/productStats";

export function useProductStat(productId: string | undefined | null): ProductStat | null {
  const [stat, setStat] = useState<ProductStat | null>(null);
  useEffect(() => {
    if (!productId) return;
    const unsub = subscribeProductStat(productId, setStat);
    return unsub;
  }, [productId]);
  return stat;
}
