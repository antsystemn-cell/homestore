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

// Lightweight column set for list views — омит heavy Base64 columns (image_url ~9MB, colors ~5.6MB).
// thumbnail_url (small) is enough for cards; full image_url is loaded on the product detail page.
const LIST_SELECT = "id,slug,name,price,original_price,thumbnail_url,category,is_on_sale,discount,brand_id,is_new,is_bogo,sales,colors_meta:colors";

// Strip heavy `image` field from colors so list payloads stay tiny while names (for swatches) remain.
const stripColorImages = (rows: any[]) =>
  (rows || []).map((r) => {
    if (Array.isArray(r?.colors_meta)) {
      r.colors = r.colors_meta.map((c: any) =>
        typeof c === "string" ? { name: c } : { name: c?.name || "", sku: c?.sku, id: c?.id }
      );
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

export const searchPublicProducts = async (query: string) => {
  try {
    return await fetchPublic<any[]>("products", {
      select: "id,slug,name,price,original_price,image_url,category,product_code",
      or: `name.ilike.%${query}%,product_code.ilike.%${query}%`,
      limit: 8,
    });
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

export const fetchRelatedPublicProducts = async (category: string, excludeId: string) => {
  try {
    const rows = await fetchPublic<any[]>("products", {
      select: LIST_SELECT,
      category: `eq.${category}`,
      id: `neq.${excludeId}`,
      is_active: "eq.true",
      limit: 4,
    });
    return stripColorImages(rows);
  } catch (error) {
    logError("relatedProducts", error);
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
