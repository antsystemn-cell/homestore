// Smart address & phone parser for admin order entry.
// Handles mixed Cyrillic / Latin transliteration like:
// "худ 11р хороо нархан хотхон 1бай 34р орц 8тоот код 1234, 99119911"
// "khud 11 khoroo narkhan khotkhon 1 bair 34 r orts 8 too 99119911"

export interface ParsedAddress {
  phone?: string;
  district?: string; // ХУД, БЗД, БГД, СХД, СБД, ЧД
  khoroo?: string;
  khotkhon?: string;
  building?: string;
  entrance?: string;
  apt?: string;
  doorCode?: string;
  landmark?: string;
}

// Latin -> Cyrillic friendly normalization for matching keywords
const translit = (s: string): string => {
  const map: Record<string, string> = {
    "kh": "х", "ch": "ч", "sh": "ш", "ts": "ц", "yo": "ё", "yu": "ю", "ya": "я",
    "ye": "е", "j": "ж", "z": "з",
    "a": "а", "b": "б", "v": "в", "g": "г", "d": "д", "e": "е",
    "i": "и", "k": "к", "l": "л", "m": "м", "n": "н", "o": "о",
    "p": "п", "r": "р", "s": "с", "t": "т", "u": "у", "f": "ф",
    "y": "ы", "h": "х", "c": "ц", "w": "в", "x": "х", "q": "к",
  };
  let out = s.toLowerCase();
  // multi-char first
  out = out.replace(/kh|ch|sh|ts|yo|yu|ya|ye/g, (m) => map[m]);
  out = out.replace(/[a-z]/g, (m) => map[m] ?? m);
  return out;
};

// District synonyms
const DISTRICTS: Array<{ code: string; patterns: RegExp[] }> = [
  { code: "ХУД", patterns: [/хан[\s-]?уул/, /худ\b/, /\bхуд\b/] },
  { code: "БЗД", patterns: [/баянзүрх/, /баянзурх/, /бзд\b/] },
  { code: "БГД", patterns: [/баянгол/, /бгд\b/] },
  { code: "СХД", patterns: [/сонгино[\s-]?хайрхан/, /сонгинохайрхан/, /схд\b/] },
  { code: "СБД", patterns: [/сүхбаатар/, /сухбаатар/, /сбд\b/] },
  { code: "ЧД", patterns: [/чингэлтэй/, /чд\b/] },
];

const findNumberBefore = (txt: string, idx: number): { value: string; start: number } | null => {
  // Look back for nearest digits group within ~12 chars
  const slice = txt.slice(Math.max(0, idx - 15), idx);
  const matches = [...slice.matchAll(/(\d+)/g)];
  if (!matches.length) return null;
  const last = matches[matches.length - 1];
  return { value: last[1], start: Math.max(0, idx - 15) + (last.index ?? 0) };
};

const findNumberAfter = (txt: string, idx: number): { value: string; end: number } | null => {
  const slice = txt.slice(idx, Math.min(txt.length, idx + 15));
  const m = slice.match(/^\D{0,8}(\d+)/);
  if (!m) return null;
  const numStart = (m.index ?? 0) + m[0].indexOf(m[1]);
  return { value: m[1], end: idx + numStart + m[1].length };
};

export function parseAddressBlob(input: string): ParsedAddress {
  const result: ParsedAddress = {};
  if (!input || !input.trim()) return result;

  let raw = " " + input.trim() + " ";

  // 1. Phone — 8 digits starting 6,7,8,9 (Mongolian mobile/landline) optionally with separators
  const phoneRe = /(?:\+?976[\s-]?)?([6789]\d[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}|[6789]\d{7})/;
  const phoneMatch = raw.match(phoneRe);
  if (phoneMatch) {
    result.phone = phoneMatch[0].replace(/[^\d]/g, "").slice(-8);
    raw = raw.replace(phoneMatch[0], " ");
  }

  // Normalize for keyword matching (keep digits, normalize letters to cyrillic)
  // Replace dashes/commas with spaces; collapse spaces
  let norm = raw.replace(/[,;|/]+/g, " ").replace(/-/g, " ").replace(/\s+/g, " ");
  // transliterate latin
  norm = norm.split(/(\d+)/).map((part) => /^\d+$/.test(part) ? part : translit(part)).join("");
  norm = norm.replace(/\s+/g, " ").trim();

  // 2. District
  for (const d of DISTRICTS) {
    if (d.patterns.some((p) => p.test(norm))) {
      result.district = d.code;
      // strip district keywords
      norm = norm.replace(/(хан[\s-]?уул|баянзүрх|баянзурх|баянгол|сонгино[\s-]?хайрхан|сонгинохайрхан|сүхбаатар|сухбаатар|чингэлтэй|худ|бзд|бгд|схд|сбд|чд)\s*(дүүрэг|дуурэг)?/g, " ");
      break;
    }
  }

  // 3. Helper to extract "<num> <keyword>" pairs
  const extractByKeyword = (keywords: string[], maxLen = 4): { value: string; matchStr: string } | null => {
    // Pattern: number (optionally followed by 'р' or 'r') then keyword within a few chars
    const kwAlt = keywords.join("|");
    const re = new RegExp(`(\\d{1,${maxLen}})\\s*(?:р|r)?\\s*(${kwAlt})\\b`, "i");
    const m = norm.match(re);
    if (m) {
      norm = norm.replace(m[0], " ");
      return { value: m[1], matchStr: m[0] };
    }
    // Reverse: keyword then number
    const re2 = new RegExp(`(${kwAlt})\\s*(\\d{1,${maxLen}})`, "i");
    const m2 = norm.match(re2);
    if (m2) {
      norm = norm.replace(m2[0], " ");
      return { value: m2[2], matchStr: m2[0] };
    }
    return null;
  };

  // Order matters: longer/more specific keywords first
  const khoroo = extractByKeyword(["хороо", "хор"], 3);
  if (khoroo) result.khoroo = khoroo.value;

  const orts = extractByKeyword(["орц", "орцны", "ороц"], 3);
  if (orts) result.entrance = orts.value;

  const apt = extractByKeyword(["тоот", "тоо", "айл"], 5);
  if (apt) result.apt = apt.value;

  const bair = extractByKeyword(["байр", "бай", "байш", "байшин"], 4);
  if (bair) result.building = bair.value;

  // Door code: "код <digits>" or "kod <digits>"
  const codeM = norm.match(/(?:код|кодо)\s*[:\-]?\s*(\d{3,8})/i);
  if (codeM) {
    result.doorCode = codeM[1];
    norm = norm.replace(codeM[0], " ");
  }

  // Khotkhon: word(s) followed by "хотхон"
  const khM = norm.match(/([\p{L}0-9]+(?:\s+[\p{L}0-9]+)?)\s+хотхон/iu);
  if (khM) {
    result.khotkhon = khM[1].trim();
    norm = norm.replace(khM[0], " ");
  }

  // Whatever remains (non-empty meaningful) becomes landmark
  const leftover = norm.replace(/\b(дүүрэг|дуурэг|р)\b/g, " ").replace(/\s+/g, " ").trim();
  if (leftover && leftover.length > 2) {
    result.landmark = leftover;
  }

  return result;
}
