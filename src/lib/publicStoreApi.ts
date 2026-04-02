const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const DEFAULT_HEADERS = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  "Content-Type": "application/json",
};

const FALLBACK_BRANDS = [
  { id: "fallback-brand-easyshop", name: "EasyShop", logo_url: null },
  { id: "fallback-brand-living", name: "Living", logo_url: null },
  { id: "fallback-brand-kitchen", name: "Kitchen Pro", logo_url: null },
];

const FALLBACK_PRODUCTS = [
  {
    id: "fallback-sofa",
    name: "Nordic буйдан",
    price: 1890000,
    original_price: 2190000,
    image_url: "/placeholder.svg",
    category: "household",
    description: "Орчин үеийн минимал загвартай, зөөлөн суудалтай буйдан.",
    sales: 18,
    is_new: true,
    is_on_sale: true,
    discount: 14,
    product_code: "HS-SOFA-01",
    brand_id: "fallback-brand-living",
    specifications: [
      { key: "Материал", value: "Даавуу" },
      { key: "Өнгө", value: "Саарал" },
    ],
    colors: [{ name: "Саарал", image: "" }],
    sizes: ["3 хүний"],
    detail_media: [],
  },
  {
    id: "fallback-table",
    name: "Oak хоолны ширээ",
    price: 980000,
    original_price: null,
    image_url: "/placeholder.svg",
    category: "kitchen",
    description: "6 хүний багтаамжтай, бат бөх модон ширээ.",
    sales: 9,
    is_new: false,
    is_on_sale: false,
    discount: null,
    product_code: "HS-TABLE-02",
    brand_id: "fallback-brand-kitchen",
    specifications: [
      { key: "Материал", value: "Oak мод" },
      { key: "Хэмжээ", value: "160x90 см" },
    ],
    colors: [{ name: "Natural", image: "" }],
    sizes: ["160x90"],
    detail_media: [],
  },
  {
    id: "fallback-lamp",
    name: "Aura ширээний гэрэл",
    price: 149000,
    original_price: 179000,
    image_url: "/placeholder.svg",
    category: "electronics",
    description: "Дулаан гэрэлтэй, унтлагын болон ажлын ширээнд тохиромжтой.",
    sales: 31,
    is_new: true,
    is_on_sale: true,
    discount: 17,
    product_code: "HS-LAMP-03",
    brand_id: "fallback-brand-easyshop",
    specifications: [
      { key: "Чадал", value: "12W" },
      { key: "Өнгөний температур", value: "3000K" },
    ],
    colors: [{ name: "Цагаан", image: "" }],
    sizes: [],
    detail_media: [],
  },
  {
    id: "fallback-chair",
    name: "Comfort сандал",
    price: 269000,
    original_price: null,
    image_url: "/placeholder.svg",
    category: "household",
    description: "Нуруу дэмждэг хийцтэй тав тухтай сандал.",
    sales: 22,
    is_new: false,
    is_on_sale: false,
    discount: null,
    product_code: "HS-CHAIR-04",
    brand_id: "fallback-brand-living",
    specifications: [
      { key: "Материал", value: "Металл + даавуу" },
      { key: "Даац", value: "120 кг" },
    ],
    colors: [{ name: "Хар", image: "" }],
    sizes: [],
    detail_media: [],
  },
  {
    id: "fallback-shelf",
    name: "Studio тавиур",
    price: 420000,
    original_price: 480000,
    image_url: "/placeholder.svg",
    category: "household",
    description: "Ном, декор, ахуйн хэрэгсэлд тохирох олон тасалгаатай тавиур.",
    sales: 12,
    is_new: false,
    is_on_sale: true,
    discount: 13,
    product_code: "HS-SHELF-05",
    brand_id: "fallback-brand-easyshop",
    specifications: [
      { key: "Өндөр", value: "180 см" },
      { key: "Өргөн", value: "80 см" },
    ],
    colors: [{ name: "Модон", image: "" }],
    sizes: [],
    detail_media: [],
  },
  {
    id: "fallback-kettle",
    name: "Smart kettle",
    price: 199000,
    original_price: null,
    image_url: "/placeholder.svg",
    category: "electronics",
    description: "Температур тохируулах ухаалаг данх.",
    sales: 27,
    is_new: true,
    is_on_sale: false,
    discount: null,
    product_code: "HS-KETTLE-06",
    brand_id: "fallback-brand-kitchen",
    specifications: [
      { key: "Багтаамж", value: "1.7L" },
      { key: "Удирдлага", value: "Touch" },
    ],
    colors: [{ name: "Silver", image: "" }],
    sizes: [],
    detail_media: [],
  },
];

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

const logFallback = (scope: string, error: unknown) => {
  console.error(`${scope} fallback activated`, error);
};

export const fetchPublicProducts = async () => {
  try {
    return await fetchPublic<any[]>("products", {
      select: "id,slug,name,price,original_price,image_url,category,is_on_sale,discount,brand_id",
    });
  } catch (error) {
    logFallback("products", error);
    return FALLBACK_PRODUCTS;
  }
};

export const fetchPublicBrands = async () => {
  try {
    return await fetchPublic<any[]>("brands", {
      select: "id,name,logo_url",
      order: "name.asc",
    });
  } catch (error) {
    logFallback("brands", error);
    return FALLBACK_BRANDS;
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
    logFallback("search", error);
    const normalized = query.trim().toLowerCase();
    return FALLBACK_PRODUCTS.filter((product) => {
      return product.name.toLowerCase().includes(normalized) || (product.product_code || "").toLowerCase().includes(normalized);
    }).slice(0, 8);
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
    logFallback("productById", error);
    const fallback = FALLBACK_PRODUCTS.find((product) => product.id === id);
    return fallback ? [fallback] : [];
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
    logFallback("productImages", error);
    return [];
  }
};

export const fetchRelatedPublicProducts = async (category: string, excludeId: string) => {
  try {
    return await fetchPublic<any[]>("products", {
      select: "id,slug,name,price,original_price,image_url,category,is_on_sale,discount,brand_id",
      category: `eq.${category}`,
      id: `neq.${excludeId}`,
      limit: 4,
    });
  } catch (error) {
    logFallback("relatedProducts", error);
    return FALLBACK_PRODUCTS.filter((product) => product.category === category && product.id !== excludeId).slice(0, 4);
  }
};

export const fetchSaleProducts = async () => {
  try {
    return await fetchPublic<any[]>("products", {
      select: "id,slug,name,price,original_price,image_url,category,is_on_sale,discount,brand_id",
      is_on_sale: "eq.true",
      order: "discount.desc.nullslast",
    });
  } catch (error) {
    logFallback("saleProducts", error);
    return FALLBACK_PRODUCTS.filter((p) => p.is_on_sale);
  }
};

export const fetchFeaturedProducts = async () => {
  try {
    return await fetchPublic<any[]>("products", {
      select: "id,slug,name,price,original_price,image_url,category,is_on_sale,discount,brand_id,is_new,sales",
      order: "sales.desc.nullslast",
      limit: 8,
    });
  } catch (error) {
    logFallback("featuredProducts", error);
    return FALLBACK_PRODUCTS.slice(0, 8);
  }
};
