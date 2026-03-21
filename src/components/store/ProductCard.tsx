import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";

interface Props {
  product: Product;
}

const ProductCard = ({ product }: Props) => {
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useCart();
  const liked = isInWishlist(product.id);

  return (
    <div
      className="bg-card rounded-xl overflow-hidden shadow-sm border border-border cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square bg-secondary">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {product.discount && (
          <span className="absolute top-2 left-2 bg-sale text-sale-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{product.discount}%
          </span>
        )}
        {product.isNew && (
          <span className="absolute top-2 right-8 bg-warning text-warning-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            Шинэ
          </span>
        )}
        <button
          className="absolute top-2 right-2 p-1 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
        >
          <Heart
            className={`h-4 w-4 ${liked ? "fill-sale text-sale" : "text-muted-foreground"}`}
          />
        </button>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-primary font-bold text-sm">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-muted-foreground text-xs line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {product.sales} борлуулалт
        </p>
      </div>
    </div>
  );
};

export default ProductCard;
