import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ScoreWeights } from "@/lib/recommendations";

export interface RecommendationConfig {
  related: Partial<ScoreWeights>;
  cart: Partial<ScoreWeights>;
}

let cache: RecommendationConfig | null = null;
let inflight: Promise<RecommendationConfig> | null = null;

export const fetchRecommendationConfig = async (): Promise<RecommendationConfig> => {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from("recommendation_settings" as any)
        .select("related_weights, cart_weights")
        .eq("id", 1)
        .maybeSingle();
      const cfg: RecommendationConfig = {
        related: (data as any)?.related_weights ?? {},
        cart: (data as any)?.cart_weights ?? {},
      };
      cache = cfg;
      return cfg;
    } catch {
      const cfg = { related: {}, cart: {} };
      cache = cfg;
      return cfg;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};

export const invalidateRecommendationConfig = () => {
  cache = null;
};

export const useRecommendationWeights = (kind: "related" | "cart") => {
  const [weights, setWeights] = useState<Partial<ScoreWeights>>(cache?.[kind] ?? {});
  useEffect(() => {
    let cancelled = false;
    fetchRecommendationConfig().then((cfg) => {
      if (!cancelled) setWeights(cfg[kind]);
    });
    return () => { cancelled = true; };
  }, [kind]);
  return weights;
};
