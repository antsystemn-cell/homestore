import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, formatPrice } from "@/data/products";
import { Star, TrendingUp } from "lucide-react";

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

  // First product is the hero, rest are side cards
  const hero = products[0];
  const rest = products.slice(1, 5);

  return (
    <section className="py-5 md:py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-foreground">Онцлох бараа</h2>
            <p className="text-[11px] text-muted-foreground">Хамгийн их борлуулалттай</p>
          </div>
        </div>

        {/* Desktop: hero + grid layout */}
        <div className="hidden md:grid md:grid-cols-12 gap-4">
          {/* Hero card */}
          <div
            onClick={() => navigate(`/product/${hero.slug || hero.id}`)}
            className="col-span-6 relative rounded-2xl overflow-hidden bg-secondary cursor-pointer group animate-fade-in aspect-[4/3]"
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
                <span className="text-white font-extrabold text-xl drop-shadow-md">
                  {formatPrice(hero.price)}
                </span>
                {hero.originalPrice != null && hero.originalPrice > hero.price && (
                  <span className="text-white/60 text-sm line-through">{formatPrice(hero.originalPrice)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Side grid */}
          <div className="col-span-6 grid grid-cols-2 gap-4">
            {rest.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/product/${p.slug || p.id}`)}
                className="relative rounded-xl overflow-hidden bg-secondary cursor-pointer group animate-fade-in aspect-square"
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

        {/* Mobile: horizontal scroll */}
        <div className="md:hidden flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
          {products.slice(0, 6).map((p, i) => (
            <div
              key={p.id}
              onClick={() => navigate(`/product/${p.slug || p.id}`)}
              className={`flex-shrink-0 snap-start cursor-pointer group animate-fade-in ${
                i === 0 ? "w-[65vw]" : "w-[44vw]"
              }`}
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                <img
                  src={imgErrors[p.id] ? "/placeholder.svg" : p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                  width={220}
                  height={220}
                  onError={() => handleImgError(p.id)}
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                {i === 0 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-[10px] font-medium">#1</span>
                  </div>
                )}
                {p.isNew && i !== 0 && (
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Шинэ
                  </span>
                )}
                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <p className="text-white font-bold text-sm drop-shadow-md">{formatPrice(p.price)}</p>
                </div>
              </div>
              <div className="mt-2 px-0.5">
                <h3 className="text-xs text-foreground font-medium line-clamp-2 leading-snug min-h-[2.5em]">
                  {p.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

FeaturedSection.displayName = "FeaturedSection";

export default FeaturedSection;