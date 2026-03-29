import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { Star, TrendingUp, ArrowRight } from "lucide-react";

interface Props {
  products: Product[];
}

const FeaturedSection = React.memo(({ products }: Props) => {
  const navigate = useNavigate();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  }, []);

  if (products.length === 0) return null;

  const hero = products[0];
  const rest = products.slice(1, 5);

  return (
    <section className="py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">
              Эрэлттэй бараа
            </p>
            <h2 className="font-display text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
              Онцлох
            </h2>
          </div>
          <button
            onClick={() => navigate("/shop")}
            className="text-xs font-medium text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Бүгдийг <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Desktop: hero + grid layout */}
        <div className="hidden md:grid md:grid-cols-12 gap-4">
          <div
            onClick={() => navigate(`/product/${hero.id}`)}
            className="col-span-6 relative rounded-2xl overflow-hidden bg-surface-container cursor-pointer group animate-fade-in aspect-[4/3]"
          >
            <img
              src={imgErrors[hero.id] ? "/placeholder.svg" : hero.image}
              alt={hero.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-white/80 text-xs font-medium">
                  {hero.sales ? `${hero.sales} борлуулсан` : "Онцлох"}
                </span>
              </div>
              <h3 className="text-white text-lg font-bold line-clamp-2 drop-shadow-md">{hero.name}</h3>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-white font-extrabold text-xl drop-shadow-md">{formatPrice(hero.price)}</span>
                {hero.originalPrice != null && hero.originalPrice > hero.price && (
                  <span className="text-white/60 text-sm line-through">{formatPrice(hero.originalPrice)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-6 grid grid-cols-2 gap-4">
            {rest.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="relative rounded-xl overflow-hidden bg-surface-container cursor-pointer group animate-fade-in aspect-square"
              >
                <img
                  src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                {p.isNew && (
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Шинэ
                  </span>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white text-sm font-semibold line-clamp-1 drop-shadow-md">{p.name}</h3>
                  <span className="text-white font-bold text-sm drop-shadow-md">{formatPrice(p.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: editorial layout - 2 column grid with product info below */}
        <div className="md:hidden">
          {/* 2-column new arrivals style */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {products.slice(0, 6).map((p, i) => (
              <div
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className={`cursor-pointer group animate-fade-in ${i === 0 ? "col-span-2" : ""}`}
              >
                <div className={`relative overflow-hidden bg-surface-container ${
                  i === 0 ? "aspect-[4/5] rounded-2xl" : "aspect-square rounded-xl"
                }`}>
                  <img
                    src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={() => handleImgError(p.id)}
                  />
                  {p.isNew && (
                    <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Шинэ
                    </span>
                  )}
                </div>
                <div className="mt-2.5">
                  <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{p.category}</p>
                  <h3 className={`font-display font-bold text-foreground leading-tight mt-0.5 line-clamp-2 ${
                    i === 0 ? "text-base" : "text-sm"
                  }`}>
                    {p.name}
                  </h3>
                  <p className={`font-display font-extrabold text-foreground mt-1 ${i === 0 ? "text-base" : "text-sm"}`}>
                    {formatPrice(p.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

FeaturedSection.displayName = "FeaturedSection";

export default FeaturedSection;
