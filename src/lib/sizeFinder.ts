// EasyShop Smart Size Finder — configurable rules-based recommendation engine.
//
// The customer only supplies height (cm) + weight (kg) and an optional fit
// preference. Everything else (category, garment measurements, material /
// stretch, scoring weights) comes from the database configuration layer so new
// products can be added by an admin without code changes.
//
// NOTE: garment measurements are FLAT PRODUCT measurements, never body
// measurements. BMI is used strictly as an internal normalisation factor and is
// never surfaced to the customer.

export type SizeCode = "S" | "M" | "L" | "XL";
export const SIZE_ORDER: SizeCode[] = ["S", "M", "L", "XL"];

export type FitPreference = "tight" | "regular" | "loose";
export type SizeCategory = "bra" | "leggings" | "top" | "jacket";
export type Confidence = "high" | "medium" | "low";

export interface GuideRow {
  size: string;
  measurement_type: string;
  measurement_value: number;
  unit?: string;
  sort_order?: number;
}

export interface SizeConfig {
  category: SizeCategory;
  material?: string | null;
  stretch_level?: string | null;
  fit_type?: string | null;
  algorithm_version?: string | null;
  score_weights?: Partial<ScoreWeights> | null;
  height_weight_rules?: Partial<CategoryRules> | null;
  chart_image_url?: string | null;
  enabled?: boolean;
}

export interface ScoreWeights {
  height: number;
  weight: number;
  category: number;
  garment: number;
}

export interface CategoryRules {
  /** Centre weight (kg) for each size */
  weightCenters: Record<SizeCode, number>;
  /** Centre height (cm) for each size */
  heightCenters: Record<SizeCode, number>;
  /** Which garment measurement drives this category */
  keyMeasurement: string[];
  weightSigma: number;
  heightSigma: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  height: 0.35,
  weight: 0.45,
  category: 0.1,
  garment: 0.1,
};

export const CATEGORY_RULES: Record<SizeCategory, CategoryRules> = {
  bra: {
    weightCenters: { S: 48, M: 55, L: 63, XL: 72 },
    heightCenters: { S: 155, M: 160, L: 165, XL: 170 },
    keyMeasurement: ["bust", "chest"],
    weightSigma: 5,
    heightSigma: 8,
  },
  leggings: {
    weightCenters: { S: 47, M: 54, L: 62, XL: 71 },
    heightCenters: { S: 156, M: 161, L: 166, XL: 171 },
    keyMeasurement: ["waist"],
    weightSigma: 5,
    heightSigma: 7,
  },
  top: {
    weightCenters: { S: 48, M: 56, L: 65, XL: 74 },
    heightCenters: { S: 156, M: 161, L: 166, XL: 171 },
    keyMeasurement: ["chest", "bust"],
    weightSigma: 5.5,
    heightSigma: 8,
  },
  jacket: {
    weightCenters: { S: 50, M: 58, L: 67, XL: 76 },
    heightCenters: { S: 157, M: 162, L: 167, XL: 172 },
    keyMeasurement: ["chest", "bust"],
    weightSigma: 6,
    heightSigma: 8,
  },
};

/** Stretch keyword -> tolerance multiplier (higher = one size covers more bodies) */
export const stretchFactor = (stretch?: string | null, material?: string | null): number => {
  const s = `${stretch || ""} ${material || ""}`.toLowerCase();
  if (s.includes("high") || (s.includes("spandex") && /(2[0-9]|1[5-9])%\s*spandex/.test(s))) return 1.6;
  if (s.includes("medium-high")) return 1.35;
  if (s.includes("woven") || s.includes("low")) return 1.0;
  if (s.includes("spandex") || s.includes("elastane")) return 1.3;
  return 1.15;
};

// ---------------------------------------------------------------------------
// Official ELLE Sport seed data (fallback when a product has no DB rows yet).
// Values are exact official garment measurements in cm.
// ---------------------------------------------------------------------------
type SeedEntry = { category: SizeCategory; material: string; stretch: string; fit: string; m: Record<string, [number, number, number, number]> };

export const ELLE_SEED: Record<string, SeedEntry> = {
  ESG0230: { category: "bra", material: "75% Nylon / 25% Spandex Interlock", stretch: "High", fit: "Slim Fit", m: { bust: [32, 33, 34, 35], side_length: [13.5, 14, 14.5, 15] } },
  ESG0221: { category: "leggings", material: "75% Nylon / 25% Spandex Interlock", stretch: "High", fit: "Slim Fit", m: { body_length: [89, 90, 91, 92], waist: [30, 32, 34, 36] } },
  ESG0217: { category: "top", material: "92% Polyester / 8% Spandex + Mesh", stretch: "Medium-High", fit: "Regular Fit", m: { length: [61, 63, 65, 67], chest: [44, 46, 48, 50], sleeve_length: [22, 23, 24, 25] } },
  ESG0194: { category: "top", material: "76% Modal / 24% Polyester", stretch: "Medium", fit: "Regular Fit", m: { length: [61, 63, 65, 67], chest: [44, 46, 48, 50], shoulder: [22, 23, 24, 25] } },
  ESG0227: { category: "jacket", material: "96% Nylon / 4% Spandex Woven", stretch: "Medium", fit: "Regular Fit", m: { length: [60, 62, 64, 66], chest: [51, 53, 55, 57], width: [9, 9.5, 10, 10.5], sleeve_length: [55, 56, 57, 58] } },
  ESG0224: { category: "leggings", material: "75% Nylon / 25% Spandex Interlock", stretch: "High", fit: "Slim Fit", m: { waist: [30, 32, 34, 36], body_length: [91, 92, 93, 94] } },
  ESG0231: { category: "top", material: "76% Modal / 26% Polyester", stretch: "Medium", fit: "Regular Fit", m: { body_length: [64, 66, 68, 70], chest: [59.5, 61.5, 63.5, 65.5], shoulder: [39.5, 41, 42.5, 44], sleeve_length: [16.5, 17.5, 18.5, 19.5] } },
  ESG0229: { category: "leggings", material: "80% Nylon / 20% Spandex Interlock", stretch: "High", fit: "Regular Fit", m: { length: [93, 95, 97, 99], waist: [33.5, 35, 36.5, 38] } },
  ESG0197: { category: "bra", material: "75% Nylon / 25% Spandex Interlock", stretch: "High", fit: "Slim Fit", m: { bust: [32, 33, 34, 35], side_length: [13, 13.5, 14, 14.5] } },
  ESG0226: { category: "jacket", material: "80% Nylon / 20% Spandex Interlock", stretch: "High", fit: "Regular Fit", m: { body_length: [62, 64, 66, 68], chest: [49, 51, 53, 55], sleeve_length: [56.5, 58, 59.5, 60.25] } },
};

export const seedGuideRows = (code?: string | null): GuideRow[] => {
  const seed = code ? ELLE_SEED[code.trim().toUpperCase()] : undefined;
  if (!seed) return [];
  const rows: GuideRow[] = [];
  Object.entries(seed.m).forEach(([type, vals], i) => {
    SIZE_ORDER.forEach((sz, j) => {
      rows.push({ size: sz, measurement_type: type, measurement_value: vals[j], unit: "cm", sort_order: i });
    });
  });
  return rows;
};

export const seedConfig = (code?: string | null): SizeConfig | null => {
  const seed = code ? ELLE_SEED[code.trim().toUpperCase()] : undefined;
  if (!seed) return null;
  return {
    category: seed.category,
    material: seed.material,
    stretch_level: seed.stretch,
    fit_type: seed.fit,
    algorithm_version: "v1",
    enabled: true,
  };
};

export const MEASUREMENT_LABELS: Record<string, string> = {
  bust: "Цээж (bust)",
  chest: "Цээж (chest)",
  waist: "Бэлхүүс",
  hip: "Түнх",
  shoulder: "Мөр",
  side_length: "Хажуугийн урт",
  body_length: "Биеийн урт",
  length: "Урт",
  sleeve_length: "Ханцуйны урт",
  width: "Өргөн",
};

export const measurementLabel = (t: string) =>
  MEASUREMENT_LABELS[t] || t.replace(/_/g, " ");

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const gaussian = (value: number, center: number, sigma: number) =>
  Math.exp(-Math.pow(value - center, 2) / (2 * Math.pow(Math.max(sigma, 0.5), 2)));

/** Internal body-size estimation from height/weight (never shown to customers). */
const estimateBody = (heightCm: number, weightKg: number) => {
  const dw = weightKg - 55;
  const dh = heightCm - 160;
  return {
    bust: 84 + dw * 0.55 + dh * 0.15,
    waist: 68 + dw * 0.75 + dh * 0.1,
    hip: 92 + dw * 0.65 + dh * 0.12,
    bmi: weightKg / Math.pow(heightCm / 100, 2),
  };
};

export interface RecommendInput {
  heightCm: number;
  weightKg: number;
  fitPreference?: FitPreference;
  config: SizeConfig;
  guides: GuideRow[];
  availableSizes?: string[];
  previousSize?: string | null;
}

export interface SizeScore {
  size: SizeCode;
  score: number;
  parts: { height: number; weight: number; category: number; garment: number };
}

export interface RecommendResult {
  recommendedSize: SizeCode;
  confidence: Confidence;
  explanation: string;
  borderline: SizeCode | null;
  alternatives: SizeScore[];
  scores: SizeScore[];
  fitPreference: FitPreference;
  algorithmVersion: string;
}

export const clampHeight = (v: number) => Math.min(200, Math.max(140, v));
export const clampWeight = (v: number) => Math.min(150, Math.max(35, v));

export function recommendSize(input: RecommendInput): RecommendResult {
  const fit: FitPreference = input.fitPreference || "regular";
  const cfg = input.config;
  const rules: CategoryRules = {
    ...CATEGORY_RULES[cfg.category] || CATEGORY_RULES.top,
    ...(cfg.height_weight_rules || {}),
  } as CategoryRules;
  const w: ScoreWeights = { ...DEFAULT_WEIGHTS, ...(cfg.score_weights || {}) };
  const height = clampHeight(input.heightCm);
  const weight = clampWeight(input.weightKg);
  const body = estimateBody(height, weight);
  const tol = stretchFactor(cfg.stretch_level, cfg.material);

  // BMI acts only as an internal normalisation nudge on the effective weight.
  const bmiShift = (body.bmi - 22) * 0.35;

  // Garment reference: use the key circumference measurement for the category.
  const keyType = rules.keyMeasurement.find((t) =>
    input.guides.some((g) => g.measurement_type === t)
  );
  const garmentBySize: Partial<Record<SizeCode, number>> = {};
  if (keyType) {
    for (const sz of SIZE_ORDER) {
      const row = input.guides.find(
        (g) => g.measurement_type === keyType && String(g.size).toUpperCase() === sz
      );
      if (row) garmentBySize[sz] = Number(row.measurement_value) * 2; // flat -> circumference
    }
  }
  const garmentVals = SIZE_ORDER.map((s) => garmentBySize[s]).filter((v): v is number => !!v);
  const garmentAvg = garmentVals.length
    ? garmentVals.reduce((a, b) => a + b, 0) / garmentVals.length
    : 0;

  const bodyKey = cfg.category === "leggings" ? body.waist : body.bust;
  // Anchor: average body value implied by the category matrix, so garment data
  // controls *spacing* between sizes rather than absolute (unknowable) ease.
  const anchorVals = SIZE_ORDER.map((sz) => {
    const b = estimateBody(rules.heightCenters[sz], rules.weightCenters[sz]);
    return cfg.category === "leggings" ? b.waist : b.bust;
  });
  const anchorAvg = anchorVals.reduce((a, b) => a + b, 0) / anchorVals.length;

  const scores: SizeScore[] = SIZE_ORDER.map((sz) => {
    const heightScore = gaussian(height, rules.heightCenters[sz], rules.heightSigma * tol * 0.75);
    const weightScore = gaussian(weight - bmiShift, rules.weightCenters[sz], rules.weightSigma * tol * 0.8);
    const categoryScore = gaussian(bodyKey, anchorVals[SIZE_ORDER.indexOf(sz)], 5 * tol);
    let garmentScore = categoryScore;
    const g = garmentBySize[sz];
    if (g && garmentAvg) {
      const target = anchorAvg + (g - garmentAvg);
      garmentScore = gaussian(bodyKey, target, 4.5 * tol);
    }
    const score =
      heightScore * w.height +
      weightScore * w.weight +
      categoryScore * w.category +
      garmentScore * w.garment;
    return { size: sz, score, parts: { height: heightScore, weight: weightScore, category: categoryScore, garment: garmentScore } };
  });

  // Restrict to sizes the product actually offers
  const available = (input.availableSizes || SIZE_ORDER.map(String))
    .map((s) => String(s).toUpperCase())
    .filter((s) => (SIZE_ORDER as string[]).includes(s)) as SizeCode[];
  const pool = scores.filter((s) => (available.length ? available.includes(s.size) : true));
  const ranked = [...(pool.length ? pool : scores)].sort((a, b) => b.score - a.score);

  let best = ranked[0];
  const second = ranked[1];
  const margin = second ? best.score - second.score : 1;
  const isBorderline = !!second && margin < 0.06;
  let borderline: SizeCode | null = null;

  if (isBorderline && second) {
    const pair = [best.size, second.size].sort(
      (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
    );
    borderline = pair[0] === best.size ? pair[1] : pair[0];
    if (fit === "tight") best = ranked.find((r) => r.size === pair[0]) || best;
    if (fit === "loose") best = ranked.find((r) => r.size === pair[1]) || best;
  }

  const confidence: Confidence = margin >= 0.12 ? "high" : margin >= 0.06 ? "medium" : "low";

  const fitLabel = fit === "tight" ? "бариу" : fit === "loose" ? "сул" : "энгийн";
  let explanation: string;
  if (isBorderline && borderline) {
    const pair = [best.size, borderline].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    explanation = `Таны мэдээллээр ${pair[0]} болон ${pair[1]} размер ойролцоо байна. ${fitLabel} өмсгөлд ${best.size} размерийг санал болгож байна.`;
  } else {
    explanation = `Таны оруулсан өндөр, жин болон энэ бүтээгдэхүүний хэмжээсийг үндэслэн ${best.size} размерийг санал болгож байна.`;
  }

  return {
    recommendedSize: best.size,
    confidence,
    explanation,
    borderline,
    alternatives: ranked.filter((r) => r.size !== best.size).slice(0, 3),
    scores: ranked,
    fitPreference: fit,
    algorithmVersion: cfg.algorithm_version || "v1",
  };
}
