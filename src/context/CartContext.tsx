import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { Product } from "@/data/products";

interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
}

interface CartContextType {
  items: CartItem[];
  wishlist: Product[];
  addToCart: (product: Product, color?: string | null, size?: string | null, quantity?: number) => void;
  removeFromCart: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  cartTotal: number;
  cartCount: number;
  clearCart: () => void;
}

function makeCartKey(productId: string, color?: string | null, size?: string | null) {
  return `${productId}__${color || ""}__${size || ""}`;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);

  const addToCart = useCallback((product: Product, color?: string | null, size?: string | null, quantity: number = 1) => {
    setItems((prev) => {
      const key = makeCartKey(product.id, color, size);
      const existing = prev.find((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize) === key);
      if (existing) {
        return prev.map((i) =>
          makeCartKey(i.product.id, i.selectedColor, i.selectedSize) === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity, selectedColor: color || null, selectedSize: size || null }];
    });
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize) !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => makeCartKey(i.product.id, i.selectedColor, i.selectedSize) !== key));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (makeCartKey(i.product.id, i.selectedColor, i.selectedSize) === key ? { ...i, quantity } : i))
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
        // BOGO: for every 2 items, 1 is free. Pay for ceil(qty/2) * 2 - floor(qty/2)
        const paidQty = Math.ceil(i.quantity / 2);
        return sum + i.product.price * paidQty;
      }
      return sum + i.product.price * i.quantity;
    }, 0), [items]);

  const cartCount = useMemo(() =>
    items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const clearCart = useCallback(() => setItems([]), []);

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
