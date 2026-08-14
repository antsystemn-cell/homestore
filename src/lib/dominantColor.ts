// Extract the dominant (most representative) color of an image.
// Used to paint brand tile / banner backgrounds with the logo's main color.

const cache = new Map<string, string | null>();

export function getDominantColor(src: string): Promise<string | null> {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!);

  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(cacheSet(src, null));
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Bucket colors (4 bits per channel), ignore transparent + near-white pixels.
        const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max > 240 && min > 240) continue; // white background
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const cur = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          cur.n++; cur.r += r; cur.g += g; cur.b += b;
          buckets.set(key, cur);
        }
        if (buckets.size === 0) return resolve(cacheSet(src, null));

        let best = { n: 0, r: 0, g: 0, b: 0 };
        let bestScore = -1;
        buckets.forEach((v) => {
          const r = v.r / v.n, g = v.g / v.n, b = v.b / v.n;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const score = v.n * (1 + sat * 1.5); // prefer frequent + colorful
          if (score > bestScore) { bestScore = score; best = v; }
        });

        const r = Math.round(best.r / best.n);
        const g = Math.round(best.g / best.n);
        const b = Math.round(best.b / best.n);
        resolve(cacheSet(src, `rgb(${r}, ${g}, ${b})`));
      } catch {
        resolve(cacheSet(src, null));
      }
    };
    img.onerror = () => resolve(cacheSet(src, null));
    img.src = src;
  });
}

function cacheSet(src: string, value: string | null) {
  cache.set(src, value);
  return value;
}

/**
 * Returns a CSS mix-blend-mode that makes a logo's baked-in white/light
 * background dissolve into the brand color so the tile reads as a solid fill.
 *  - light brand color  → "multiply" (white bg becomes the color, dark ink stays)
 *  - dark brand color   → "normal"   (logo's own dark bg already matches)
 */
export function blendModeForColor(color: string | null): "multiply" | "normal" {
  if (!color) return "normal";
  const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!m) return "normal";
  const r = +m[1], g = +m[2], b = +m[3];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? "multiply" : "normal";
}
