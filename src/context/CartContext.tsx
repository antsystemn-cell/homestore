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


function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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

  // Merge logic for cart and wishlist when user logs in
  const prevUserRef = useRef<string | null>(null);
  useEffect(() => {
    const mergeData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          prevUserRef.current = null;
          return;
        }

        // Only merge if user just logged in (prevUser was null)
        if (prevUserRef.current !== user.id) {
          prevUserRef.current = user.id;

          // 1. Merge Cart
          const { data: dbCartData } = await supabase
            .from("active_carts" as any)
            .select("items")
            .eq("user_id", user.id)
            .maybeSingle();
          
          const dbCart = dbCartData as any;

          const localCart = loadCartFromStorage();
          if (localCart.length > 0) {
            // Logic: Local cart is currently synced via the sync effect.
            // When user logs in, we want to ensure their local cart is merged/saved to DB.
            // The existing `useEffect` sync timer will handle upserting local items to DB.
          } else if (dbCart?.items && Array.isArray(dbCart.items)) {
            // If local cart is empty, try to restore from DB
            // (Requires product detail hydration - left for future refinement if needed)
          }


          // 2. Wishlist Merge (Logic: persist local wishlist to DB if we had a table, 
          // but since wishlist is client-side only for now, we just persist it in localStorage)
        }
      } catch (err) {
        console.error("Error during cart/wishlist merge:", err);
      }
    };
    mergeData();
  }, [items, wishlist]);


  const addToCart = useCallback((product: Product, color?: string | null, size?: string | null, quantity: number = 1, giftPackage?: GiftPackage | null) => {
    setItems((prev) => {
      const key = makeCartKey(product.id, color, size, giftPackage?.id);
      const existing = prev.find((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) === key);
      if (existing) {
        // Rule: If same item (Product + Color + Size + Gift) exists, increment quantity
        return prev.map((i) =>
          makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity, selectedColor: color || null, selectedSize: size || null, selectedGiftPackage: giftPackage || null }];
    });
    track("add_to_cart", {
      product_id: product.id,
      category: product.category,
      value: product.price * quantity,
      metadata: { color: color || null, size: size || null, quantity, giftPackage: giftPackage?.name || null },
    });
  }, []);


  const removeFromCart = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) !== key));
    track("remove_from_cart", { metadata: { key } });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) !== key));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (makeCartKey(i.product.id, i.selectedColor, i.selectedSize, i.selectedGiftPackage?.id) === key ? { ...i, quantity } : i))
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
      if (i.product.isBogo) {
        const paidQty = Math.ceil(i.quantity / 2);
        return sum + i.product.price * paidQty;
      }
      return sum + i.product.price * i.quantity;
    }, 0), [items]);

  const cartCount = useMemo(() =>
    items.reduce((sum, i) => sum + i.quantity, 0), [items]);

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
