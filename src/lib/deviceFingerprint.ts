// Lightweight device fingerprint (canvas + UA + screen + tz hash).
// Persisted in localStorage so repeat visits report the same value.

function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "es_device_fp";
  const cached = localStorage.getItem(KEY);
  if (cached) return cached;

  let canvasFp = "";
  try {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 50;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 100, 30);
      ctx.fillStyle = "#069";
      ctx.fillText("EasyShop-FP-🎁", 4, 4);
      canvasFp = c.toDataURL();
    }
  } catch {
    /* ignore */
  }

  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width) + "x" + String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || ""),
    canvasFp,
  ].join("|");

  const fp = hash(parts);
  try {
    localStorage.setItem(KEY, fp);
  } catch {
    /* ignore */
  }
  return fp;
}
