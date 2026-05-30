import { Search, Bell, Clock, X, ArrowUpRight } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Product, mapDbProduct } from "@/data/products";
import { searchPublicProducts } from "@/lib/publicStoreApi";
import { useScrollDirection } from "@/hooks/useScrollDirection";

const DEBOUNCE_MS = 300;
const HISTORY_KEY = "easyshop:searchHistory";
const HISTORY_MAX = 8;

const loadHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
};

const saveHistory = (items: string[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
  } catch {
    /* ignore */
  }
};

const Header = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const pushHistory = useCallback((value: string) => {
    const v = value.trim();
    if (!v) return;
    setHistory((prev) => {
      const next = [v, ...prev.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, HISTORY_MAX);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeHistoryItem = useCallback((value: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x !== value);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  // Mobile scroll-aware shrink effect — only on the home page (matches video reference).
  const { isScrolled, direction } = useScrollDirection(40);
  const isHome = location.pathname === "/";
  const collapsed = isHome && isScrolled && direction === "down";

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
      setShowResults(true); // still open so history shows
    }
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), DEBOUNCE_MS);
  };

  const pickHistory = (value: string) => {
    setQuery(value);
    pushHistory(value);
    doSearch(value);
  };

  const trimmed = query.trim();
  const showFullHistory = showResults && !trimmed && history.length > 0;
  const filteredHistory = trimmed
    ? history.filter((item) => item.toLowerCase().includes(trimmed.toLowerCase()))
    : [];
  const showSuggestions = showResults && trimmed && filteredHistory.length > 0;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div
        className={`max-w-6xl mx-auto px-4 md:px-8 flex items-center gap-4 md:gap-8 transition-[padding] duration-300 ease-out ${
          collapsed ? "py-1.5 md:py-3" : "py-3"
        }`}
      >
        <span
          onClick={() => navigate("/")}
          className={`cursor-pointer shrink-0 text-foreground overflow-hidden whitespace-nowrap transition-all duration-300 ease-out md:!max-w-none md:!opacity-100 md:!ml-0 md:text-2xl ${
            collapsed
              ? "max-w-0 opacity-0 -ml-4 text-base"
              : "max-w-[180px] opacity-100 ml-0 text-xl"
          }`}
        >
          <span className="font-bold">Easy</span><span className="font-light text-muted-foreground">Shop</span>
        </span>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          
          <button onClick={() => navigate("/shop")} className="hover:text-foreground transition-colors">Брэндүүд</button>
          <button onClick={() => navigate("/wishlist")} className="hover:text-foreground transition-colors">Таалагдсан</button>
          <button onClick={() => navigate("/cart")} className="hover:text-foreground transition-colors">Сагс</button>
        </nav>

        <div className="relative flex-1 max-w-md ml-auto transition-all duration-300 ease-out">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Бараа хайх..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed) pushHistory(trimmed);
            }}
            className={`w-full rounded-full bg-secondary pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 ease-out md:!py-2.5 ${
              collapsed ? "py-1.5" : "py-2.5"
            }`}
          />

          {showFullHistory && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg max-h-72 overflow-y-auto z-50">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Сүүлийн хайлтууд</span>
                <button
                  onMouseDown={clearHistory}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Цэвэрлэх
                </button>
              </div>
              {history.map((item) => (
                <div
                  key={item}
                  className="group flex items-center gap-3 px-4 py-2 hover:bg-secondary transition-colors"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <button
                    onMouseDown={() => pickHistory(item)}
                    className="flex-1 text-left text-xs text-foreground truncate"
                  >
                    {item}
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      removeHistoryItem(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                    aria-label="Устгах"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg max-h-72 overflow-y-auto z-50">
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Сүүлийн хайлтуудаас</span>
              </div>
              {filteredHistory.map((item) => (
                <div
                  key={item}
                  className="group flex items-center gap-3 px-4 py-2 hover:bg-secondary transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <button
                    onMouseDown={() => pickHistory(item)}
                    className="flex-1 text-left text-xs text-foreground truncate"
                  >
                    {item}
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      removeHistoryItem(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                    aria-label="Устгах"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showResults && trimmed && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg max-h-64 overflow-y-auto z-50">
              {results.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={() => {
                    pushHistory(trimmed);
                    navigate(`/product/${p.slug || p.id}`);
                    setShowResults(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                >
                  <img
                    src={p.image}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover bg-secondary"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.price.toLocaleString("mn-MN")}₮</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showResults && trimmed && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg z-50 p-4">
              <p className="text-xs text-muted-foreground text-center">Үр дүн олдсонгүй</p>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="relative p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-sale rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
