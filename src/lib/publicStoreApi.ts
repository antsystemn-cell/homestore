import type { ScoreWeights } from "./recommendations";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const DEFAULT_HEADERS = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  "Content-Type": "application/json",
};

const withTimeout = async <T,>(promise: Promise<T>, ms = 8000): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timeout")), ms)),
  ]);
};

const buildUrl = (path: string, params: Record<string, string | number | boolean | undefined>) => {
  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return url.toString();
};

async function fetchPublic<T>(path: string, params: Record<string, string | number | boolean | undefined>) {
  const response = await withTimeout(
    fetch(buildUrl(path, params), {
      headers: DEFAULT_HEADERS,
      cache: "no-store",
    })
  );

  if (!response.ok) {
    throw new Error(`Public API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

const logError = (scope: string, error: unknown) => {
  console.error(`${scope} request failed`, error);
};

// Lightweight column set for list views. Storage-hosted image_url is now just a short URL
// (transformed/resized via Supabase render endpoint in <ProductCard>), so it's safe to include
// as a fallback when thumbnail_url is missing. Heavy fields (detail_media, description) are still omitted.
const LIST_SELECT = "id,slug,name,price,original_price,image_url,thumbnail_url,category,is_on_sale,discount,brand_id,brand_position,is_new,is_bogo,has_gift,sales,colors_meta:colors";

// Keep `image` URL — it's a small string (Storage URL) needed so card swatches can switch slides.
// Only strip if a value looks like an inline base64 blob (legacy data) to keep payload tiny.
const stripColorImages = (rows: any[]) =>
  (rows || []).map((r) => {
    if (Array.isArray(r?.colors_meta)) {
      r.colors = r.colors_meta.map((c: any) => {
        if (typeof c === "string") return { name: c };
        const img = typeof c?.image === "string" ? c.image : "";
        const isInlineBlob = img.startsWith("data:");
        return {
          name: c?.name || "",
          sku: c?.sku,
          id: c?.id,
          image: isInlineBlob ? "" : img,
        };
      });
      delete r.colors_meta;
    }
    return r;
  });

export const fetchPublicProducts = async () => {
  try {
    const rows = await fetchPublic<any[]>("products", {
      select: LIST_SELECT,
      is_active: "eq.true",
    });
    return stripColorImages(rows);
  } catch (error) {
    logError("products", error);
    return [];
  }
};

export const fetchPublicBrands = async () => {
  try {
    return await fetchPublic<any[]>("brands", {
      select: "id,name,logo_url",
      order: "name.asc",
    });
  } catch (error) {
    logError("brands", error);
    return [];
  }
};

export const fetchPublicCategories = async () => {
  try {
    return await fetchPublic<any[]>("categories", {
      select: "id,name,icon,position,parent_id,slug,image_url",
      order: "position.asc,name.asc",
    });
  } catch (error) {
    logError("categories", error);
    return [];
  }
};

export const searchPublicProducts = async (query: string) => {
  try {
    const { tokenize, tokenVariants, scoreCandidate } = await import("./searchNormalize");
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    // PostgREST `ilike` is case-insensitive; escape PostgREST-significant chars in tokens.
    const esc = (s: string) => s.replace(/[(),*]/g, " ").trim();
    const fields = ["name", "product_code", "category"];

    // For each token, build an OR clause across fields × variants.
    // Tokens are combined with AND so multi-word queries narrow the result set.
    const andParts = tokens.map((tk) => {
      const variants = tokenVariants(tk).map(esc).filter(Boolean);
      const orInner = variants
        .flatMap((v) => fields.map((f) => `${f}.ilike.*${v}*`))
        .join(",");
      return `or(${orInner})`;
    });

    const params: Record<string, string | number> = {
      select: "id,slug,name,price,original_price,image_url,category,product_code",
      is_active: "eq.true",
      limit: 40,
    };
    if (andParts.length === 1) {
      // PostgREST top-level `or` must be wrapped in parentheses: `or=(cond1,cond2)`.
      params.or = `(${andParts[0].slice(3, -1)})`;
    } else {
      params.and = `(${andParts.join(",")})`;
    }

    const rows = await fetchPublic<any[]>("products", params);

    // Client-side rerank by relevance, return top 8.
    const ranked = (rows || [])
      .map((r) => ({
        row: r,
        score:
          scoreCandidate(r?.name || "", query) +
          scoreCandidate(r?.product_code || "", query) * 0.6 +
          scoreCandidate(r?.category || "", query) * 0.3,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.row);

    return ranked;
  } catch (error) {
    logError("search", error);
    return [];
  }
};

export const fetchPublicProductById = async (id: string) => {
  try {
    return await fetchPublic<any[]>("products", {
      select: "*",
      id: `eq.${id}`,
      limit: 1,
    });
  } catch (error) {
    logError("productById", error);
    return [];
  }
};

export const fetchPublicProductBySlug = async (slug: string) => {
  try {
    return await fetchPublic<any[]>("products", {
      select: "*",
      slug: `eq.${slug}`,
      limit: 1,
    });
  } catch (error) {
    logError("productBySlug", error);
    return [];
  }
};

export const fetchPublicProductImages = async (productId: string) => {
  try {
    return await fetchPublic<any[]>("product_images", {
      select: "image_url",
      product_id: `eq.${productId}`,
      order: "position.asc",
    });
  } catch (error) {
    logError("productImages", error);
    return [];
  }
};

export const fetchRelatedPublicProducts = async (
  category: string,
  excludeId: string,
  opts?: { brandId?: string | null; price?: number | null; name?: string | null; limit?: number; weights?: Partial<ScoreWeights> },
) => {
  try {
    const { rankCandidates } = await import("./recommendations");
    const limit = opts?.limit ?? 8;

    // Pull a wider candidate pool: same category OR same brand. Brand is a
    // strong cross-category signal.
    const orParts: string[] = [];
    if (category) orParts.push(`category.eq.${category}`);
    if (opts?.brandId) orParts.push(`brand_id.eq.${opts.brandId}`);
    const params: Record<string, string | number> = {
      select: LIST_SELECT,
      is_active: "eq.true",
      id: `neq.${excludeId}`,
      limit: 40,
    };
    if (orParts.length > 0) {
      params.or = `(${orParts.join(",")})`;
    } else {
      params.order = "sales.desc.nullslast";
    }

    const rows = (await fetchPublic<any[]>("products", params)) || [];
    const ranked = rankCandidates(
      rows,
      [{ id: excludeId, category, brand_id: opts?.brandId ?? null, price: opts?.price ?? null, name: opts?.name ?? null }],
      new Set([excludeId]),
      limit,
      opts?.weights,
    );
    return stripColorImages(ranked);
  } catch (error) {
    logError("relatedProducts", error);
    return [];
  }
};

// Grouped similar products: returns products grouped by "same brand" and
// "same category" so the UI can show tabs like "Ижил брэнд" / "Ижил төрөл".
// Same brand+category is the strongest signal (e.g. чихэвч + Sony → other Sony чихэвч).
export const fetchSimilarProductsGrouped = async (
  seedProduct: { id: string; category?: string | null; brand_id?: string | null; price?: number | null; name?: string | null },
  opts?: { limit?: number; weights?: Partial<ScoreWeights> },
): Promise<{ sameBrand: any[]; sameCategory: any[]; brandAndCategory: any[] }> => {
  try {
    const { rankCandidates } = await import("./recommendations");
    const limit = opts?.limit ?? 12;
    const exclude = new Set([seedProduct.id]);
    const seeds = [{ id: seedProduct.id, category: seedProduct.category ?? null, brand_id: seedProduct.brand_id ?? null, price: seedProduct.price ?? null, name: seedProduct.name ?? null }];

    const brandPromise: Promise<any[]> = seedProduct.brand_id
      ? fetchPublic<any[]>("products", {
          select: LIST_SELECT,
          is_active: "eq.true",
          id: `neq.${seedProduct.id}`,
          brand_id: `eq.${seedProduct.brand_id}`,
          limit: 40,
        }).catch(() => [])
      : Promise.resolve([]);
    const catPromise: Promise<any[]> = seedProduct.category
      ? fetchPublic<any[]>("products", {
          select: LIST_SELECT,
          is_active: "eq.true",
          id: `neq.${seedProduct.id}`,
          category: `eq.${seedProduct.category}`,
          limit: 40,
        }).catch(() => [])
      : Promise.resolve([]);

    const [brandRows, catRows] = await Promise.all([brandPromise, catPromise]);

    const brandAndCategoryRows = (brandRows || []).filter(
      (r: any) => r.category && r.category === seedProduct.category,
    );
    const brandAndCategory = stripColorImages(
      rankCandidates(brandAndCategoryRows, seeds, exclude, limit, opts?.weights),
    );
    const sameBrand = stripColorImages(
      rankCandidates(brandRows || [], seeds, exclude, limit, opts?.weights),
    );
    const sameCategory = stripColorImages(
      rankCandidates(catRows || [], seeds, exclude, limit, opts?.weights),
    );

    return { sameBrand, sameCategory, brandAndCategory };
  } catch (error) {
    logError("similarProductsGrouped", error);
    return { sameBrand: [], sameCategory: [], brandAndCategory: [] };
  }
};

// Smart recommendations for the cart page. Combines categories + brands from
// all cart items, then ranks against the cart as a multi-seed signal.
export const fetchCartRecommendations = async (
  seeds: Array<{ id: string; category?: string | null; brand_id?: string | null; price?: number | null; name?: string | null }>,
  limit = 8,
  weights?: Partial<ScoreWeights>,
) => {
  try {
    if (!seeds.length) return [];
    const { rankCandidates } = await import("./recommendations");
    const categories = Array.from(new Set(seeds.map((s) => s.category).filter(Boolean) as string[]));
    const brands = Array.from(new Set(seeds.map((s) => s.brand_id).filter(Boolean) as string[]));
    const orParts: string[] = [];
    if (categories.length) orParts.push(`category.in.(${categories.map((c) => `"${c}"`).join(",")})`);
    if (brands.length) orParts.push(`brand_id.in.(${brands.join(",")})`);
    if (orParts.length === 0) return [];

    const excludeIds = new Set(seeds.map((s) => s.id));
    const params: Record<string, string | number> = {
      select: LIST_SELECT,
      is_active: "eq.true",
      or: `(${orParts.join(",")})`,
      limit: 60,
    };
    const rows = (await fetchPublic<any[]>("products", params)) || [];
    const ranked = rankCandidates(rows, seeds, excludeIds, limit, weights);
    return stripColorImages(ranked);
  } catch (error) {
    logError("cartRecommendations", error);
    return [];
  }
};

export const fetchSaleProducts = async () => {
  try {
    const rows = await fetchPublic<any[]>("products", {
      select: LIST_SELECT,
      is_on_sale: "eq.true",
      is_active: "eq.true",
      order: "discount.desc.nullslast",
    });
    return stripColorImages(rows);
  } catch (error) {
    logError("saleProducts", error);
    return [];
  }
};

export const fetchNewProducts = async (limit = 10) => {
  try {
    const rows = await fetchPublic<any[]>("products", {
      select: LIST_SELECT,
      is_new: "eq.true",
      is_active: "eq.true",
      order: "created_at.desc",
      limit,
    });
    return stripColorImages(rows);
  } catch (error) {
    logError("newProducts", error);
    return [];
  }
};

export const fetchFeaturedProducts = async () => {
  try {
    const rows = await fetchPublic<any[]>("products", {
      select: LIST_SELECT,
      is_active: "eq.true",
      order: "sales.desc.nullslast",
      limit: 8,
    });
    return stripColorImages(rows);
  } catch (error) {
    logError("featuredProducts", error);
    return [];
  }
};

// Fetch product rows for a list of IDs using the lightweight LIST_SELECT.
// Preserves the order of the input IDs (RPC callers expect ranked output).
export const fetchPublicProductsByIds = async (ids: string[]) => {
  try {
    const clean = Array.from(new Set((ids || []).filter(Boolean)));
    if (clean.length === 0) return [];
    const rows = await fetchPublic<any[]>("products", {
      select: LIST_SELECT,
      id: `in.(${clean.join(",")})`,
      is_active: "eq.true",
    });
    const stripped = stripColorImages(rows || []);
    const byId = new Map(stripped.map((r: any) => [r.id, r]));
    return clean.map((id) => byId.get(id)).filter(Boolean) as any[];
  } catch (error) {
    logError("productsByIds", error);
    return [];
  }
};

// "Үүнтэй хамт авдаг бараа" — RPC returns ranked product_ids; hydrate to list rows.
export const fetchFrequentlyBoughtTogether = async (productId: string, limit = 3) => {
  try {
    const { data, error } = await supabase.rpc("get_frequently_bought_together", {
      _product_id: productId,
      _limit: limit,
    });
    if (error) throw error;
    const ids = (data || []).map((r: any) => r.product_id).filter(Boolean);
    return await fetchPublicProductsByIds(ids);
  } catch (error) {
    logError("frequentlyBoughtTogether", error);
    return [];
  }
};

// "Танд зориулсан" — personalized based on user's past-purchase categories.
export const fetchPersonalizedRecommendations = async (limit = 8) => {
  try {
    const { data, error } = await supabase.rpc("get_personalized_recommendations", {
      _limit: limit,
    });
    if (error) throw error;
    const ids = (data || []).map((r: any) => r.product_id).filter(Boolean);
    return await fetchPublicProductsByIds(ids);
  } catch (error) {
    logError("personalizedRecommendations", error);
    return [];
  }
};
