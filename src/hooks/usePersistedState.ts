import { useEffect, useRef, useState } from "react";

/**
 * Persist React state to localStorage. Supports Date via a serializer.
 * Keys are auto-prefixed to avoid collisions.
 */
const PREFIX = "easyshop:";

type Options<T> = {
  serialize?: (v: T) => string;
  deserialize?: (raw: string) => T;
};

export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  options?: Options<T>
) {
  const fullKey = PREFIX + key;
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? (JSON.parse as (raw: string) => T);

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return typeof initial === "function" ? (initial as () => T)() : initial;
    }
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw !== null) return deserialize(raw);
    } catch { /* ignore */ }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  const skip = useRef(true);
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    try { window.localStorage.setItem(fullKey, serialize(state)); } catch { /* ignore */ }
  }, [fullKey, state, serialize]);

  return [state, setState] as const;
}

// Date helpers
export const dateSerialize = (d: Date | undefined) => (d ? d.toISOString() : "");
export const dateDeserialize = (raw: string): Date | undefined => {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
};
