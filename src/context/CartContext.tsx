import React, { createContext, useContext, useState, ReactNode } from "react";
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
  addToCart: (product: Product, color?: string | null, size?: string | null) => void;
  removeFromCart: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  cartTotal: number;
  cartCount: number;
  clearCart: () => void;
}

function cartKey(productId: string, color?: string | null, size?: string | null) {
  return `${productId}__${color || ""}__${size || ""}`;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);

  const addToCart = (product: Product, color?: string | null, size?: string | null) => {
    setItems((prev) => {
      const key = cartKey(product.id, color, size);
      const existing = prev.find((i) => cartKey(i.product.id, i.selectedColor, i.selectedSize) === key);
      if (existing) {
        return prev.map((i) =>
          cartKey(i.product.id, i.selectedColor, i.selectedSize) === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, selectedColor: color || null, selectedSize: size || null }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const toggleWishlist = (product: Product) => {
    setWishlist((prev) =>
      prev.find((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  };

  const isInWishlist = (productId: string) =>
    wishlist.some((p) => p.id === productId);

  const cartTotal = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider
      value={{
        items,
        wishlist,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleWishlist,
        isInWishlist,
        cartTotal,
        cartCount,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
