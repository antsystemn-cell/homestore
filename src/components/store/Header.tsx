import { Search, Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { products } from "@/data/products";

const Header = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof products>([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim().length > 0) {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-3">
        <h1
          className="text-xl font-extrabold tracking-tight text-foreground cursor-pointer"
          onClick={() => navigate("/")}
        >
          Home<span className="text-primary/60">Store</span>
        </h1>
        <button className="relative p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-sale rounded-full" />
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Бараа хайх..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.trim() && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className="w-full rounded-2xl bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
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
    </header>
  );
};

export default Header;
