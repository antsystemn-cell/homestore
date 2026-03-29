import { Search, Menu, ShoppingBag } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Product, mapDbProduct } from "@/data/products";
import { searchPublicProducts } from "@/lib/publicStoreApi";
import { useCart } from "@/context/CartContext";

const DEBOUNCE_MS = 300;

const Header = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { cartCount } = useCart();

  const doSearch = useCallback(async (value: string) => {
    if (value.trim().length > 0) {
      try {
        const data = await searchPublicProducts(value);
        setResults((data || []).map(mapDbProduct));
      } catch {
        setResults([]);
      }
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), DEBOUNCE_MS);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl md:bg-background/95 md:backdrop-blur-md md:border-b md:border-border">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-5 py-4">
          <button
            onClick={() => navigate("/shop")}
            className="p-1 text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>

          <span
            className="font-display text-base font-extrabold tracking-[0.15em] uppercase text-foreground cursor-pointer"
            onClick={() => navigate("/")}
          >
            HomeStore
          </span>

          <button
            onClick={() => navigate("/cart")}
            className="p-1 text-foreground relative"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex max-w-6xl mx-auto px-8 py-3 items-center gap-8">
          <span
            className="font-display text-xl font-extrabold tracking-[0.12em] uppercase cursor-pointer text-foreground"
            onClick={() => navigate("/")}
          >
            HomeStore
          </span>

          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">Нүүр</button>
            <button onClick={() => navigate("/shop")} className="hover:text-foreground transition-colors">Ангилал</button>
            <button onClick={() => navigate("/wishlist")} className="hover:text-foreground transition-colors">Таалагдсан</button>
            <button onClick={() => navigate("/cart")} className="hover:text-foreground transition-colors">Сагс</button>
          </nav>

          <div className="relative flex-1 max-w-md ml-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Бараа хайх..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => query.trim() && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="w-full rounded-full bg-surface-container pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow border-none"
            />
            {showResults && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-lg max-h-64 overflow-y-auto z-50">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => {
                      navigate(`/product/${p.id}`);
                      setShowResults(false);
                      setQuery("");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-left"
                  >
                    <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover bg-surface-container" loading="lazy" />
                    <div>
                      <p className="text-xs font-semibold">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.price.toLocaleString("mn-MN")}₮</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showResults && query.trim() && results.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-lg z-50 p-4">
                <p className="text-xs text-muted-foreground text-center">Үр дүн олдсонгүй</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] bg-background md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => { setShowSearch(false); setQuery(""); setShowResults(false); }} className="p-1">
              <Menu className="h-5 w-5 rotate-45" />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Бараа хайх..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                className="w-full rounded-full bg-surface-container pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-none"
              />
            </div>
          </div>
          {results.length > 0 && (
            <div className="px-4 divide-y divide-outline-variant/30">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { navigate(`/product/${p.id}`); setShowSearch(false); setQuery(""); }}
                  className="w-full flex items-center gap-3 py-3 text-left"
                >
                  <img src={p.image} alt="" className="h-12 w-12 rounded-lg object-cover bg-surface-container" loading="lazy" />
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.price.toLocaleString("mn-MN")}₮</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Header;
