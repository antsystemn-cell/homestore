import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();
let loaded = false;

async function load() {
  try {
    const { data } = await supabase.from("spin_config" as any).select("is_enabled").eq("id", 1).maybeSingle();
    const v = Boolean((data as any)?.is_enabled);
    cached = v;
    listeners.forEach((fn) => fn(v));
  } catch {
    cached = false;
    listeners.forEach((fn) => fn(false));
  }
}

export function refreshSpinEnabled() {
  loaded = true;
  void load();
}

/** React hook returning current spin-wheel enabled flag. */
export function useSpinEnabled(): boolean {
  const [v, setV] = useState<boolean>(cached ?? false);
  useEffect(() => {
    listeners.add(setV);
    if (!loaded) {
      loaded = true;
      void load();
    } else if (cached !== null) {
      setV(cached);
    }
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
