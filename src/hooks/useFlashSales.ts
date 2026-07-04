import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FlashSaleRow {
  id: string;
  product_id: string;
  sale_price: number;
  starts_at: string;
  ends_at: string;
  product_name: string;
  product_slug: string | null;
  product_price: number;
  product_image: string | null;
  product_thumbnail: string | null;
  discount_percent: number;
}

let cache: { at: number; rows: FlashSaleRow[] } | null = null;
const CACHE_MS = 60_000;
const listeners = new Set<(rows: FlashSaleRow[]) => void>();

async function loadFlashSales(force = false): Promise<FlashSaleRow[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) return cache.rows;
  const { data, error } = await supabase.rpc("get_active_flash_sales" as any);
  if (error) {
    console.error("flash_sales load", error);
    return cache?.rows || [];
  }
  const rows = (data as any as FlashSaleRow[]) || [];
  cache = { at: now, rows };
  listeners.forEach((l) => l(rows));
  return rows;
}

export function invalidateFlashSales() {
  cache = null;
  void loadFlashSales(true);
}

export function useFlashSales() {
  const [rows, setRows] = useState<FlashSaleRow[]>(cache?.rows || []);
  useEffect(() => {
    let cancelled = false;
    void loadFlashSales().then((r) => {
      if (!cancelled) setRows(r);
    });
    const l = (r: FlashSaleRow[]) => setRows(r);
    listeners.add(l);
    return () => {
      cancelled = true;
      listeners.delete(l);
    };
  }, []);
  // Auto-refresh once per minute so expiring sales drop out client-side too.
  useEffect(() => {
    const id = window.setInterval(() => void loadFlashSales(true), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return rows;
}

export function useFlashSaleMap() {
  const rows = useFlashSales();
  return useMemo(() => {
    const m = new Map<string, FlashSaleRow>();
    rows.forEach((r) => m.set(r.product_id, r));
    return m;
  }, [rows]);
}

export function useFlashSaleFor(productId: string | undefined) {
  const map = useFlashSaleMap();
  return productId ? map.get(productId) || null : null;
}
