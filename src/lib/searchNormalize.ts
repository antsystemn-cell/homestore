// Search normalization helpers — Latin/Cyrillic transliteration, tokenization,
// and fuzzy scoring used by the public product search.

const cyrToLatMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ү: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

// Reverse map — Latin → Cyrillic (best-effort: ordered by length, longest first).
const latToCyrPairs: Array<[string, string]> = [
  ["shch", "щ"], ["sch", "щ"],
  ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"],
  ["zh", "ж"], ["kh", "х"], ["ch", "ч"], ["sh", "ш"], ["ts", "ц"],
  ["ee", "ий"], ["oo", "оо"], ["uu", "үү"],
  ["a", "а"], ["b", "б"], ["v", "в"], ["w", "в"], ["g", "г"],
  ["d", "д"], ["e", "э"], ["z", "з"], ["i", "и"], ["y", "й"],
  ["j", "ж"], ["k", "к"], ["l", "л"], ["m", "м"], ["n", "н"],
  ["o", "о"], ["p", "п"], ["r", "р"], ["s", "с"], ["t", "т"],
  ["u", "у"], ["f", "ф"], ["h", "х"], ["c", "к"], ["q", "к"], ["x", "кс"],
];

export const cyrillicToLatin = (input: string): string => {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => (ch in cyrToLatMap ? cyrToLatMap[ch] : ch))
    .join("");
};

export const latinToCyrillic = (input: string): string => {
  let s = input.toLowerCase();
  let out = "";
  let i = 0;
  while (i < s.length) {
    let matched = false;
    for (const [lat, cyr] of latToCyrPairs) {
      if (s.startsWith(lat, i)) {
        out += cyr;
        i += lat.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += s[i];
      i += 1;
    }
  }
  return out;
};

// Strip diacritics, lowercase, collapse whitespace.
export const normalize = (input: string): string =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Tokenize on whitespace, keep tokens >= 1 char (no punctuation noise).
export const tokenize = (input: string): string[] =>
  normalize(input)
    .split(/[\s,.\-_/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

// Build the set of search variants for a token (original + transliterations).
export const tokenVariants = (token: string): string[] => {
  const set = new Set<string>();
  const base = token.toLowerCase();
  set.add(base);
  set.add(cyrillicToLatin(base));
  set.add(latinToCyrillic(base));
  return Array.from(set).filter((v) => v.length > 0);
};

// Levenshtein distance — for fuzzy reranking only (small strings).
export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
};

// Score a candidate against the original query (higher is better).
export const scoreCandidate = (haystack: string, query: string): number => {
  const h = normalize(haystack);
  const q = normalize(query);
  if (!h || !q) return 0;
  const hLat = cyrillicToLatin(h);
  const qLat = cyrillicToLatin(q);

  let score = 0;
  if (h === q || hLat === qLat) score += 1000;
  if (h.startsWith(q) || hLat.startsWith(qLat)) score += 500;
  if (h.includes(q) || hLat.includes(qLat)) score += 200;

  // Per-token contains
  for (const tk of tokenize(q)) {
    const variants = tokenVariants(tk);
    for (const v of variants) {
      if (h.includes(v) || hLat.includes(v)) {
        score += 50;
        break;
      }
    }
  }

  // Typo tolerance — small Levenshtein on first word of haystack.
  const firstWord = h.split(" ")[0] || "";
  const dist = levenshtein(firstWord.slice(0, Math.max(qLat.length, 8)), qLat);
  if (dist <= 2) score += 100 - dist * 20;

  return score;
};
