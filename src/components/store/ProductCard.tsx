import { Heart, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";

interface Props {
  product: Product;
}

const ProductCard = ({ product }: Props) => {
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist, addToCart } = useCart();
  const liked = isInWishlist(product.id);

  return (
    <div
      className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border cursor-pointer active:scale-[0.97] transition-all duration-200 group"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square bg-secondary overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.discount && (
            <span className="bg-sale text-sale-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg">
              -{product.discount}%
            </span>
          )}
          {product.isNew && (
            <span className="bg-warning text-warning-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg">
              Шинэ
            </span>
          )}
        </div>
        {/* Wishlist */}
        <button
          className="absolute top-2 right-2 p-1.5 rounded-xl bg-background/70 backdrop-blur-md shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${liked ? "fill-sale text-sale" : "text-muted-foreground"}`}
          />
        </button>
        {/* Quick add to cart */}
        <button
          className="absolute bottom-2 right-2 p-2 rounded-xl bg-primary text-primary-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(product);
          }}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3">
        <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-foreground font-extrabold text-sm">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-muted-foreground text-[10px] line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          <span className="inline-block h-1 w-1 rounded-full bg-primary/40" />
          {product.sales} борлуулалт
        </p>
      </div>
    </div>
  );
};

export default ProductCard;
