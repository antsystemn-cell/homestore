import { supabase } from "@/integrations/supabase/client";

export interface ProductStat {
  avg: number;
  count: number;
}

type Listener = (stat: ProductStat) => void;

const cache = new Map<string, ProductStat>();
const listeners = new Map<string, Set<Listener>>();
const pending = new Set<string>();
let flushTimer: number | null = null;

function notify(id: string, stat: ProductStat) {
  cache.set(id, stat);
  const ls = listeners.get(id);
  if (ls) ls.forEach((fn) => fn(stat));
}

async function flush() {
  flushTimer = null;
  const ids = Array.from(pending);
  pending.clear();
  if (!ids.length) return;
  try {
    const { data, error } = await supabase.rpc("get_product_review_stats" as any, { _ids: ids });
    if (error) throw error;
    const seen = new Set<string>();
    (data as any[] | null || []).forEach((row) => {
      const stat = { avg: Number(row.avg_rating) || 0, count: Number(row.review_count) || 0 };
      notify(row.product_id, stat);
      seen.add(row.product_id);
    });
    // Zero-out ids with no reviews so UI stops loading
    ids.forEach((id) => {
      if (!seen.has(id)) notify(id, { avg: 0, count: 0 });
    });
  } catch (e) {
    ids.forEach((id) => notify(id, cache.get(id) || { avg: 0, count: 0 }));
  }
}

function requestStat(id: string) {
  if (cache.has(id)) return;
  pending.add(id);
  if (flushTimer == null) {
    flushTimer = window.setTimeout(flush, 60);
  }
}

export function subscribeProductStat(id: string, fn: Listener): () => void {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(fn);
  const cached = cache.get(id);
  if (cached) fn(cached);
  else requestStat(id);
  return () => {
    listeners.get(id)?.delete(fn);
  };
}

export function invalidateProductStat(id: string) {
  cache.delete(id);
  requestStat(id);
}
