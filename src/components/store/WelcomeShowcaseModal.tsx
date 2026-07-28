import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Flame } from "lucide-react";
import { Product, formatPrice } from "@/data/products";

interface Props {
  featured: Product[];
  sale: Product[];
}

const STORAGE_KEY = "welcome_showcase_seen";

const WelcomeShowcaseModal = ({ featured, sale }: Props) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (featured.length === 0 && sale.length === 0) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [featured.length, sale.length]);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  if (!open) return null;

  const go = (p: Product) => {
    close();
    navigate(`/product/${p.slug || p.id}`);
  };

  const renderCard = (p: Product) => {
    const discountPct =
      p.originalPrice && p.originalPrice > p.price
        ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
        : p.discount || 0;
    return (
      <button
        key={p.id}
        onClick={() => go(p)}
        className="group flex-shrink-0 w-[130px] text-left snap-start"
      >
        <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border/60 group-hover:border-primary/40 transition-colors">
          <img
            src={p.thumbnail || p.image}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discountPct > 0 && (
            <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              -{discountPct}%
            </span>
          )}
        </div>
        <h4 className="mt-1.5 text-[11px] font-medium text-foreground line-clamp-2 leading-snug">
          {p.name}
        </h4>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xs font-bold text-foreground">
            {formatPrice(p.price)}
          </span>
          {p.originalPrice != null && p.originalPrice > p.price && (
            <span className="text-[10px] text-muted-foreground line-through">
              {formatPrice(p.originalPrice)}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Хаах"
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5 pb-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Тавтай морил! 👋</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Онцлох болон хямдралтай бараануудаас сонгоно уу
          </p>
        </div>

        <div className="p-5 space-y-5">
          {featured.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Онцлох бараа</h3>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-1">
                {featured.slice(0, 8).map(renderCard)}
              </div>
            </section>
          )}

          {sale.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Flame className="h-3.5 w-3.5 text-destructive" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Хямдралтай</h3>
                <button
                  onClick={() => {
                    close();
                    navigate("/sales");
                  }}
                  className="ml-auto text-xs font-medium text-destructive hover:underline"
                >
                  Бүгдийг →
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-1">
                {sale.slice(0, 8).map(renderCard)}
              </div>
            </section>
          )}
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={close}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Дэлгүүр үзэх
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeShowcaseModal;
