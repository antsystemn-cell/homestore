import { useEffect, useRef, useState } from "react";

/**
 * Persist React state to localStorage and (optionally) the URL query string.
 * - Keys are auto-prefixed in localStorage to avoid collisions.
 * - When `urlKey` is provided, the value is mirrored to ?<urlKey>=... so the
 *   filter can be shared by copying the URL, and is restored on reopen.
 *   URL value takes precedence over localStorage on initial load.
 */
const PREFIX = "easyshop:";

type Options<T> = {
  serialize?: (v: T) => string;
  deserialize?: (raw: string) => T;
  /** When set, this state is also mirrored to ?<urlKey>=... in the URL. */
  urlKey?: string;
};

function readUrlParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch { return null; }
}

function writeUrlParam(name: string, raw: string | null) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (raw === null || raw === "") url.searchParams.delete(name);
    else url.searchParams.set(name, raw);
    window.history.replaceState({}, "", url.toString());
  } catch { /* ignore */ }
}

export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  options?: Options<T>
) {
  const fullKey = PREFIX + key;
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? (JSON.parse as (raw: string) => T);
  const urlKey = options?.urlKey;

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return typeof initial === "function" ? (initial as () => T)() : initial;
    }
    // 1) URL takes precedence
    if (urlKey) {
      const raw = readUrlParam(urlKey);
      if (raw !== null) {
        try { return deserialize(raw); } catch { /* fall through */ }
      }
    }
    // 2) localStorage
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw !== null) return deserialize(raw);
    } catch { /* ignore */ }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  const skip = useRef(true);
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const raw = serialize(state);
    try { window.localStorage.setItem(fullKey, raw); } catch { /* ignore */ }
    if (urlKey) writeUrlParam(urlKey, raw === undefined ? null : raw);
  }, [fullKey, state, serialize, urlKey]);

  return [state, setState] as const;
}

// Date helpers
export const dateSerialize = (d: Date | undefined) => (d ? d.toISOString() : "");
export const dateDeserialize = (raw: string): Date | undefined => {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
};

// Plain-string helpers (avoid JSON quoting in URL)
export const stringSerialize = (s: string) => s;
export const stringDeserialize = (raw: string) => raw;

/** Copy the current URL to clipboard. Returns true on success. */
export async function shareCurrentUrl(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const url = window.location.href;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}
