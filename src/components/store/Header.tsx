import { Search, Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product, mapDbProduct } from "@/data/products";
import { searchPublicProducts } from "@/lib/publicStoreApi";

const Header = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (value: string) => {
    setQuery(value);
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
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4 md:gap-8">
        <h1
          className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground cursor-pointer shrink-0"
          onClick={() => navigate("/")}
        >
          Home<span className="text-primary/50">Store</span>
        </h1>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
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
            className="w-full rounded-full bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg max-h-64 overflow-y-auto z-50">
              {results.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={() => {
                    navigate(`/product/${p.id}`);
                    setShowResults(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                >
                  <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover bg-secondary" />
                  <div>
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.price.toLocaleString("mn-MN")}₮</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showResults && query.trim() && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg z-50 p-4">
              <p className="text-xs text-muted-foreground text-center">Үр дүн олдсонгүй</p>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-3 right-3 h-2 w-2 bg-sale rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
