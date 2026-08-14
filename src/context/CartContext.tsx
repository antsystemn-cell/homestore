import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect, useRef } from "react";
import { Product, GiftPackage } from "@/data/products";
import { track } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  selectedGiftPackage?: GiftPackage | null;
}

interface CartContextType {
  items: CartItem[];
  wishlist: Product[];
  addToCart: (product: Product, color?: string | null, size?: string | null, quantity?: number, giftPackage?: GiftPackage | null) => void;
  removeFromCart: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  cartTotal: number;
  cartCount: number;
  clearCart: () => void;
}

function makeCartKey(productId: string, color?: string | null, size?: string | null, giftPackageId?: string | null) {
  return `${productId}__${color || ""}__${size || ""}__${giftPackageId || ""}`;
}

const CART_STORAGE_KEY = "easyshop_cart";
const WISHLIST_STORAGE_KEY = "easyshop_wishlist";

function loadWishlistFromStorage(): Product[] {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveWishlistToStorage(items: Product[]) {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}


const MAX_QTY = 99;
/** Anything above this in stored data is corrupted legacy data, not a real order */
const SANE_QTY = 20;
const REPAIR_FLAG = "easyshop_cart_repair_v2";

/** Guard against corrupted/exploded quantities (NaN, Infinity, huge merge loops) */
export function sanitizeQty(q: any): number {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_QTY);
}

/** Repair quantities coming from persisted storage (local or DB) */
function repairQty(q: any): number {
  const n = sanitizeQty(q);
  return n > SANE_QTY ? 1 : n;
}

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const items = parsed
          .filter((i: any) => i && i.product && i.product.id)
          .map((i: any) => ({ ...i, quantity: repairQty(i.quantity) }));
        try { localStorage.setItem(REPAIR_FLAG, "1"); } catch {}
        return items;
      }
    }
  } catch {}
  return [];
}



function saveCartToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [wishlist, setWishlist] = useState<Product[]>(() => loadWishlistFromStorage());

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  useEffect(() => {
    saveWishlistToStorage(wishlist);
  }, [wishlist]);


  // Persist cart to `active_carts` for logged-in users so abandoned-cart reminders work
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        if (items.length === 0) {
          await supabase.from("active_carts" as any).delete().eq("user_id", user.id);
          return;
        }
        const slim = items.map((i) => ({
          product_id: i.product.id,
          product: { id: i.product.id, name: i.product.name, price: i.product.price },
          quantity: i.quantity,
          color: i.selectedColor ?? null,
          size: i.selectedSize ?? null,
        }));
        await supabase
          .from("active_carts" as any)
          .upsert({ user_id: user.id, items: slim, updated_at: new Date().toISOString(), reminded_at: null }, { onConflict: "user_id" });
      } catch {}
    }, 1500);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [items]);

  // Merge cart once when the user logs in (never re-run on items change — that caused
  // exponential quantity doubling)
  const mergedUserRef = useRef<string | null>(null);
  useEffect(() => {
    const mergeForUser = async (userId: string) => {
      if (mergedUserRef.current === userId) return;
      mergedUserRef.current = userId;
      try {
        const { data: dbCartData } = await supabase
          .from("active_carts" as any)
          .select("items")
          .eq("user_id", userId)
          .maybeSingle();

        const dbItems = (dbCartData as any)?.items;
        if (!Array.isArray(dbItems) || dbItems.length === 0) return;

        setItems((prevItems) => {
          const merged = prevItems.map((i) => ({ ...i, quantity: sanitizeQty(i.quantity) }));
          dbItems.forEach((dbItem: any) => {
            if (!dbItem?.product_id) return;
            const idx = merged.findIndex(
              (li) =>
                li.product.id === dbItem.product_id &&
                (li.selectedColor ?? null) === (dbItem.color ?? null) &&
                (li.selectedSize ?? null) === (dbItem.size ?? null)
            );
            if (idx > -1) {
              // Prefer the larger quantity instead of summing (summing duplicated on re-runs)
              merged[idx] = {
                ...merged[idx],
                quantity: sanitizeQty(Math.max(merged[idx].quantity, sanitizeQty(dbItem.quantity))),
              };
            } else {
              merged.push({
                product: {
                  id: dbItem.product_id,
                  name: dbItem.product?.name || "Product",
                  price: dbItem.product?.price || 0,
                  image: "/placeholder.svg",
                  category: "",
                } as any,
                quantity: sanitizeQty(dbItem.quantity),
                selectedColor: dbItem.color ?? null,
                selectedSize: dbItem.size ?? null,
              });
            }
          });
          return merged;
        });
      } catch (err) {
        console.error("Error during cart merge:", err);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) void mergeForUser(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void mergeForUser(session.user.id);
      } else {
        mergedUserRef.current = null;
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);



  const addToCart = useCallback((product: Product, color?: string | null, size?: string | null, quantity: number = 1, giftPackage?: GiftPackage | null) => {
    const qty = sanitizeQty(quantity);
    setItems((prev) => {
      const key = makeCartKey(product.id, color, size, giftPackage?.id);
      const existing = prev.find((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) === key);
      if (existing) {
        // Rule: If same item (Product + Color + Size + Gift) exists, increment quantity
        return prev.map((i) =>
          makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) === key
            ? { ...i, quantity: sanitizeQty(sanitizeQty(i.quantity) + qty) }
            : i
        );
      }
      return [...prev, { product, quantity: qty, selectedColor: color || null, selectedSize: size || null, selectedGiftPackage: giftPackage || null }];
    });
    track("add_to_cart", {
      product_id: product.id,
      category: product.category,
      value: product.price * qty,
      metadata: { color: color || null, size: size || null, quantity: qty, giftPackage: giftPackage?.name || null },
    });
  }, []);


  const removeFromCart = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) !== key));
    track("remove_from_cart", { metadata: { key } });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    const qty = Math.floor(Number(quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      setItems((prev) => prev.filter((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) !== key));
      return;
    }
    const safe = sanitizeQty(qty);
    setItems((prev) =>
      prev.map((i) => (makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) === key ? { ...i, quantity: safe } : i))
    );
  }, []);


  const toggleWishlist = useCallback((product: Product) => {
    setWishlist((prev) =>
      prev.find((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  }, []);

  const isInWishlist = useCallback((productId: string) =>
    wishlist.some((p) => p.id === productId), [wishlist]);

  const cartTotal = useMemo(() =>
    items.reduce((sum, i) => {
      const q = sanitizeQty(i.quantity);
      if (i.product.isBogo) {
        const paidQty = Math.ceil(q / 2);
        return sum + i.product.price * paidQty;
      }
      return sum + i.product.price * q;
    }, 0), [items]);

  const cartCount = useMemo(() =>
    items.reduce((sum, i) => sum + sanitizeQty(i.quantity), 0), [items]);


  const clearCart = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(CART_STORAGE_KEY); } catch {}
  }, []);

  const value = useMemo<CartContextType>(() => ({
    items, wishlist, addToCart, removeFromCart, updateQuantity,
    toggleWishlist, isInWishlist, cartTotal, cartCount, clearCart,
  }), [items, wishlist, addToCart, removeFromCart, updateQuantity,
    toggleWishlist, isInWishlist, cartTotal, cartCount, clearCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
