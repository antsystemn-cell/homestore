import airFryer from "@/assets/products/air-fryer.jpg";
import earbuds from "@/assets/products/earbuds.jpg";
import ledLight from "@/assets/products/led-light.jpg";
import blender from "@/assets/products/blender.jpg";
import vacuum from "@/assets/products/vacuum.jpg";
import storageBox from "@/assets/products/storage-box.jpg";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description: string;
  sales: number;
  isNew?: boolean;
  isOnSale?: boolean;
  discount?: number;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Агаарын фритюр",
    price: 189000,
    originalPrice: 249000,
    image: airFryer,
    category: "kitchen",
    description: "Тосгүй хоол хийх боломжтой ухаалаг агаарын фритюр. 5 литрийн багтаамжтай, автомат унтраалттай, хялбар цэвэрлэгддэг.",
    sales: 342,
    isOnSale: true,
    discount: 24,
  },
  {
    id: "2",
    name: "Утасгүй чихэвч",
    price: 79000,
    originalPrice: 120000,
    image: earbuds,
    category: "electronics",
    description: "Дуу чимээ тусгаарлагчтай утасгүй чихэвч. Bluetooth 5.3, 30 цагийн батарей, IPX5 усны хамгаалалттай.",
    sales: 1205,
    isOnSale: true,
    discount: 34,
  },
  {
    id: "3",
    name: "LED ухаалаг гэрэл",
    price: 25000,
    originalPrice: 35000,
    image: ledLight,
    category: "electronics",
    description: "WiFi холболттой RGB LED гэрэл. Утаснаасаа удирдах боломжтой, 16 сая өнгө, цаг тохируулагчтай.",
    sales: 890,
    isOnSale: true,
    discount: 29,
    isNew: true,
  },
  {
    id: "4",
    name: "Хүчирхэг блендер",
    price: 145000,
    originalPrice: 185000,
    image: blender,
    category: "kitchen",
    description: "1200 ваттын хүчин чадалтай блендер. Мөс бутлах чадвартай, 6 хурдны горим, BPA-free материалтай.",
    sales: 567,
    isOnSale: true,
    discount: 22,
  },
  {
    id: "5",
    name: "Робот тоос сорогч",
    price: 450000,
    originalPrice: 590000,
    image: vacuum,
    category: "home",
    description: "Ухаалаг робот тоос сорогч. Автомат цэнэглэгчтэй, газрын зураг гаргадаг, утаснаас удирддаг.",
    sales: 234,
    isOnSale: true,
    discount: 24,
    isNew: true,
  },
  {
    id: "6",
    name: "Гал тогооны хайрцаг",
    price: 35000,
    originalPrice: 45000,
    image: storageBox,
    category: "kitchen",
    description: "8 ширхэг өөр өөр хэмжээтэй хадгалах савны иж бүрдэл. BPA-free, агаар нэвтрүүлдэггүй таглаатай.",
    sales: 1567,
    isOnSale: true,
    discount: 22,
  },
];

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
