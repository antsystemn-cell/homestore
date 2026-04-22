// Shared color name → hex mapping. Used by ProductCard and admin diagnostics.

export const COLOR_HEX: Record<string, string> = {
  // Mongolian (Cyrillic)
  "хар": "#1a1a1a", "цагаан": "#f5f5f5", "улаан": "#e53e3e", "шар": "#ecc94b",
  "ногоон": "#38a169", "цэнхэр": "#3182ce", "хөх": "#2b6cb0", "ягаан": "#f4a6c0",
  "саарал": "#a0aec0", "бор": "#8B4513", "ягаан алтан": "#e8a0bf",
  "алтан": "#d4a84b", "мөнгөн": "#c0c0c0", "мөнгөлөг": "#c0c0c0",
  "улбар шар": "#ed8936", "нил ягаан": "#805ad5", "тунгалаг": "#e2e8f0",
  "ил": "#e2e8f0", "цайвар": "#f5f0e1", "хүрэн": "#7b3f00",
  "тэнгэр": "#87ceeb", "цэнхэр хөх": "#2b6cb0", "номин": "#1a365d",
  "час улаан": "#c53030", "ногоон цэнхэр": "#319795", "оливын": "#808000",
  "шаргал": "#f6e05e", "хүрэн улаан": "#9b2c2c", "хар хөх": "#1a365d",
  "цайвар саарал": "#cbd5e0", "хар саарал": "#4a5568",
  "цайвар ягаан": "#fbb6ce", "цайвар цэнхэр": "#90cdf4",
  "цайвар ногоон": "#9ae6b4", "хүүхэн хар": "#2d3748",
  // English
  "black": "#1a1a1a", "white": "#f5f5f5", "red": "#e53e3e", "blue": "#3182ce",
  "green": "#38a169", "yellow": "#ecc94b", "pink": "#f4a6c0", "gray": "#a0aec0",
  "grey": "#a0aec0", "brown": "#8B4513", "orange": "#ed8936", "purple": "#805ad5",
  "gold": "#d4a84b", "silver": "#c0c0c0", "beige": "#f5f0e1", "navy": "#1a365d",
  "cream": "#fffdd0", "rose": "#e8a0bf", "coral": "#f56565",
  "khaki": "#c3b091", "olive": "#808000", "maroon": "#800000", "teal": "#319795",
  "cyan": "#06b6d4", "magenta": "#d53f8c", "violet": "#805ad5",
  "ivory": "#fffff0", "tan": "#d2b48c", "mint": "#9ae6b4", "lime": "#84cc16",
  "indigo": "#4338ca", "lavender": "#e6e6fa", "turquoise": "#40e0d0",
  "transparent": "#e2e8f0", "clear": "#e2e8f0", "multicolor": "#888",
};

export function normalizeColorName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/өнгө(тэй|нтэй|ний)?/g, " ")
    .replace(/colou?r/g, " ")
    .replace(/[^a-zа-яёөү\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashToHex(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export type ColorResolution = {
  raw: string;
  normalized: string;
  hex: string;
  source: "exact" | "normalized" | "combo" | "inline-hex" | "fallback";
};

export function resolveColor(name: string): ColorResolution {
  const raw = (name || "").toLowerCase().trim();
  const normalized = normalizeColorName(name);

  if (!raw) return { raw: "", normalized, hex: "#cccccc", source: "fallback" };
  if (COLOR_HEX[raw]) return { raw, normalized, hex: COLOR_HEX[raw], source: "exact" };
  if (COLOR_HEX[normalized]) return { raw, normalized, hex: COLOR_HEX[normalized], source: "normalized" };

  const words = normalized.split(" ").filter(Boolean);
  for (let len = words.length; len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const combo = words.slice(i, i + len).join(" ");
      if (COLOR_HEX[combo]) return { raw, normalized, hex: COLOR_HEX[combo], source: "combo" };
    }
  }

  const hexMatch = raw.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
  if (hexMatch) return { raw, normalized, hex: hexMatch[0], source: "inline-hex" };

  return { raw, normalized, hex: hashToHex(normalized || raw), source: "fallback" };
}

export function getColorHex(name: string): string {
  return resolveColor(name).hex;
}
