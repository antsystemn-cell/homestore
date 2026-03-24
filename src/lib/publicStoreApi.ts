const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const DEFAULT_HEADERS = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  "Content-Type": "application/json",
};

const withTimeout = async <T,>(promise: Promise<T>, ms = 10000): Promise<T> => {
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
  const response = await withTimeout(fetch(buildUrl(path, params), { headers: DEFAULT_HEADERS }));

  if (!response.ok) {
    throw new Error(`Public API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const fetchPublicProducts = () =>
  fetchPublic<any[]>("products", {
    select: "id,name,price,original_price,image_url,category,description,sales,is_new,is_on_sale,discount,product_code,brand_id",
  });

export const fetchPublicBrands = () =>
  fetchPublic<any[]>("brands", {
    select: "id,name,logo_url",
    order: "name.asc",
  });

export const searchPublicProducts = (query: string) =>
  fetchPublic<any[]>("products", {
    select: "*",
    or: `name.ilike.%${query}%,product_code.ilike.%${query}%`,
    limit: 8,
  });

export const fetchPublicProductById = (id: string) =>
  fetchPublic<any[]>("products", {
    select: "*",
    id: `eq.${id}`,
    limit: 1,
  });

export const fetchPublicProductImages = (productId: string) =>
  fetchPublic<any[]>("product_images", {
    select: "image_url",
    product_id: `eq.${productId}`,
    order: "position.asc",
  });

export const fetchRelatedPublicProducts = (category: string, excludeId: string) =>
  fetchPublic<any[]>("products", {
    select: "*",
    category: `eq.${category}`,
    id: `neq.${excludeId}`,
    limit: 4,
  });