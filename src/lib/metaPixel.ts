/**
 * Meta (Facebook) Pixel helper
 * Pixel-ийн үндсэн script нь index.html дээр ачаалагдана.
 * Энд зөвхөн event илгээх нимгэн бүрхүүл байна — fbq байхгүй бол чимээгүй алгасана.
 */

type FbqParams = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function call(kind: "track" | "trackCustom", event: string, params?: FbqParams) {
  try {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;
    window.fbq(kind, event, params ?? {});
  } catch {
    // silent
  }
}

/** Meta-ийн стандарт event (ViewContent, AddToCart, Purchase гэх мэт) */
export function fbTrack(event: string, params?: FbqParams) {
  call("track", event, params);
}

/** Өөрийн тодорхойлсон event (SizeFinderCompleted гэх мэт) */
export function fbTrackCustom(event: string, params?: FbqParams) {
  call("trackCustom", event, params);
}

/** SPA дотор хуудас солигдох бүрд PageView */
export function fbPageView(path?: string) {
  call("track", "PageView", path ? { page_path: path } : undefined);
}

export const CURRENCY = "MNT";
