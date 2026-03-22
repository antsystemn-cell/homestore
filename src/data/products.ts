export interface ProductSpec {
  key: string;
  value: string;
}

export interface DetailMedia {
  type: "image" | "video";
  url: string;
  caption?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  image_url?: string | null;
  category: string;
  description?: string | null;
  sales?: number | null;
  isNew?: boolean | null;
  isOnSale?: boolean | null;
  discount?: number | null;
  productCode?: string | null;
  specifications?: ProductSpec[];
  detailMedia?: DetailMedia[];
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
    name: row.name,
    price: row.price,
    originalPrice: row.original_price,
    image: row.image_url || "/placeholder.svg",
    image_url: row.image_url,
    category: row.category,
    description: row.description,
    sales: row.sales,
    isNew: row.is_new,
    isOnSale: row.is_on_sale,
    discount: row.discount,
    productCode: row.product_code,
    specifications: Array.isArray(row.specifications) ? row.specifications : [],
  };
}
