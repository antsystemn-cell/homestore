export interface ProductColor {
  name: string;
  image: string;
  sku?: string;
}

export interface ProductSpec {
  key: string;
  value: string;
}

export interface DetailMedia {
  type: "image" | "video";
  url: string;
  caption?: string;
  thumbnail?: string;
}

export interface Product {
  id: string;
  slug?: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  image_url?: string | null;
  thumbnail?: string | null;
  category: string;
  description?: string | null;
  sales?: number | null;
  isNew?: boolean | null;
  isOnSale?: boolean | null;
  discount?: number | null;
  productCode?: string | null;
  specifications?: ProductSpec[];
  detailMedia?: DetailMedia[];
  brand_id?: string | null;
  brand_position?: number | null;
  brandName?: string | null;
  brandLogo?: string | null;
  colors?: ProductColor[];
  sizes?: string[];
  isBogo?: boolean | null;
}

export const categories = [
  { id: "home", label: "Нүүр", icon: "Home" },
  { id: "electronics", label: "Цахилгаан бараа", icon: "Zap" },
  { id: "kitchen", label: "Гал тогоо", icon: "ChefHat" },
  { id: "household", label: "Гэр ахуй", icon: "Sofa" },
  { id: "sale", label: "Хямдрал", icon: "Tag" },
  { id: "categories", label: "Ангилал", icon: "Grid3X3" },
];

export function formatPrice(price: number): string {
  return price.toLocaleString("mn-MN") + "₮";
}

/** Map DB row to Product */
export function mapDbProduct(row: any): Product {
  return {
    id: row.id,
    slug: row.slug || row.id,
    name: row.name,
    price: row.price,
    originalPrice: row.original_price,
    image: row.image_url || "/placeholder.svg",
    image_url: row.image_url,
    thumbnail: row.thumbnail_url || null,
    category: row.category,
    description: row.description,
    sales: row.sales,
    isNew: row.is_new,
    isOnSale: row.is_on_sale,
    discount: row.discount,
    productCode: row.product_code,
    specifications: Array.isArray(row.specifications) ? row.specifications : [],
    detailMedia: Array.isArray(row.detail_media) ? row.detail_media : [],
    brand_id: row.brand_id || null,
    colors: Array.isArray(row.colors) ? row.colors.map((c: any) => typeof c === 'string' ? { name: c, image: '', sku: '' } : { name: c.name || '', image: c.image || '', sku: c.sku || '' }) : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    isBogo: row.is_bogo ?? false,
  };
}
