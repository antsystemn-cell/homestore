import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";

interface Props {
  product: Product;
}

const ProductCard = ({ product }: Props) => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-card overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square bg-secondary overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2.5">
        <h3 className="text-xs text-foreground line-clamp-2 leading-snug font-medium">
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
      </div>
    </div>
  );
};

export default ProductCard;
