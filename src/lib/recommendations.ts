// Smart product recommendation scoring — used by ProductPage ("Төстэй бараа")
// and CartPage ("Танд санал болгох").
//
// Strategy: query a wider candidate pool from the API (same category OR same
// brand), then rank client-side by a weighted score combining:
//   - category match
//   - brand match
//   - price proximity (Gaussian decay)
//   - name/token overlap
//   - popularity (sales)
//   - sale boost
// This avoids needing extra server columns/embeddings while still giving
// meaningfully relevant results.

import { tokenize } from "./searchNormalize";

export interface CandidateRow {
  id: string;
  name?: string | null;
  category?: string | null;
  brand_id?: string | null;
  price?: number | null;
  sales?: number | null;
  is_on_sale?: boolean | null;
  discount?: number | null;
}

export interface RecommendationSeed {
  id?: string | null;
  name?: string | null;
  category?: string | null;
  brand_id?: string | null;
  price?: number | null;
}

const STOP_TOKENS = new Set([
  "the", "and", "for", "with", "ml", "cm", "kg", "set",
  "ба", "болон", "ширхэг", "том", "жижиг",
]);

const nameTokens = (name?: string | null): Set<string> => {
  const out = new Set<string>();
  for (const t of tokenize(name || "")) {
    if (t.length < 2) continue;
    if (STOP_TOKENS.has(t)) continue;
    out.add(t);
  }
  return out;
};

const priceProximity = (a?: number | null, b?: number | null): number => {
  if (!a || !b) return 0;
  const ratio = Math.abs(a - b) / Math.max(a, b);
  // 1.0 when identical, ~0 when >100% off. Gaussian-ish.
  return Math.max(0, 1 - ratio * 1.4);
};

export const scoreCandidate = (
  candidate: CandidateRow,
  seeds: RecommendationSeed[],
): number => {
  if (!seeds.length) return 0;
  let total = 0;

  // Aggregate seed signals
  const seedCategories = new Set(seeds.map((s) => s.category).filter(Boolean) as string[]);
  const seedBrands = new Set(seeds.map((s) => s.brand_id).filter(Boolean) as string[]);
  const seedTokens = new Set<string>();
  for (const s of seeds) nameTokens(s.name).forEach((t) => seedTokens.add(t));
  const avgPrice =
    seeds.reduce((sum, s) => sum + (s.price || 0), 0) /
    Math.max(seeds.filter((s) => s.price).length, 1);

  // Category match
  if (candidate.category && seedCategories.has(candidate.category)) {
    total += 40;
  }

  // Brand match (strong signal)
  if (candidate.brand_id && seedBrands.has(candidate.brand_id)) {
    total += 35;
  }

  // Token overlap
  const cTokens = nameTokens(candidate.name);
  let overlap = 0;
  cTokens.forEach((t) => { if (seedTokens.has(t)) overlap += 1; });
  total += Math.min(overlap, 4) * 12;

  // Price proximity
  total += priceProximity(candidate.price, avgPrice) * 25;

  // Popularity (bounded)
  const sales = Math.max(0, Number(candidate.sales) || 0);
  total += Math.min(sales / 50, 1) * 10;

  // Sale boost (small) — shoppers respond to discounts
  if (candidate.is_on_sale || (candidate.discount && candidate.discount > 0)) {
    total += 5;
  }

  return total;
};

export const rankCandidates = <T extends CandidateRow>(
  candidates: T[],
  seeds: RecommendationSeed[],
  excludeIds: Set<string>,
  limit: number,
): T[] => {
  const seen = new Set<string>();
  const scored: Array<{ row: T; score: number }> = [];
  for (const row of candidates || []) {
    if (!row?.id || excludeIds.has(row.id) || seen.has(row.id)) continue;
    seen.add(row.id);
    scored.push({ row, score: scoreCandidate(row, seeds) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.row);
};
