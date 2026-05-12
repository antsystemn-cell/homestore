import { Search, ShoppingBag, Heart, User } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Product, mapDbProduct } from "@/data/products";
import { searchPublicProducts } from "@/lib/publicStoreApi";

interface Props {
  logoUrl?: string | null;
}

const DEBOUNCE_MS = 300;

const NAV_ITEMS = [
  { label: "HOME APPLIANCES", to: "/Westinghouse" },
  { label: "COOKWARE", to: "/Westinghouse" },
  { label: "SHOP", to: "/Westinghouse" },
  { label: "ABOUT US", to: "/Westinghouse" },
  { label: "CUSTOMER CARE", to: "/Westinghouse" },
];

const WestinghouseHeader: React.FC<Props> = ({ logoUrl }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Inject Oswald font once for the condensed bold look
  useEffect(() => {
    const id = "wh-oswald-font";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

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

  const oswald = { fontFamily: "'Oswald', 'Montserrat', sans-serif" } as const;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      {/* Top row: logo, tagline, search, icons */}
      <div className="w-full px-4 md:px-10 py-3 md:py-4 flex items-center gap-3 md:gap-6">
        {/* Logo */}
        <button
          onClick={() => navigate("/Westinghouse")}
          className="shrink-0 flex items-center"
          aria-label="Westinghouse"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Westinghouse"
              className="h-8 md:h-12 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
          ) : (
            <span className="text-lg md:text-2xl font-bold tracking-tight">Westinghouse</span>
          )}
        </button>

        {/* Tagline (desktop) */}
        <div
          className="hidden md:block text-[#ff5a1f] uppercase tracking-wide text-xl lg:text-2xl font-bold"
          style={oswald}
        >
          Powering People since 1886
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md ml-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query.trim() && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="w-full rounded-full bg-secondary pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg max-h-64 overflow-y-auto z-50">
              {results.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={() => {
                    navigate(`/product/${p.slug || p.id}`);
                    setShowResults(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                >
                  <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover bg-secondary" loading="lazy" />
                  <div>
                    <p className="text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.price.toLocaleString("mn-MN")}₮</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0 text-foreground">
          <button onClick={() => navigate("/cart")} aria-label="Cart" className="hover:opacity-70 transition-opacity">
            <ShoppingBag className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <button onClick={() => navigate("/wishlist")} aria-label="Wishlist" className="hover:opacity-70 transition-opacity">
            <Heart className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <button onClick={() => navigate("/profile")} aria-label="Profile" className="hover:opacity-70 transition-opacity">
            <User className="h-6 w-6" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Mobile tagline */}
      <div
        className="md:hidden px-4 pb-2 text-[#ff5a1f] uppercase tracking-wide text-base font-bold"
        style={oswald}
      >
        Powering People since 1886
      </div>

      {/* Black navigation bar */}
      <nav className="bg-black w-full">
        <div className="px-4 md:px-10">
          <ul
            className="flex items-center gap-6 md:gap-12 overflow-x-auto no-scrollbar py-3 md:py-4 text-white uppercase tracking-wider text-sm md:text-base font-semibold whitespace-nowrap"
            style={oswald}
          >
            {NAV_ITEMS.map((it) => (
              <li key={it.label} className="md:flex-1 md:text-center">
                <button
                  onClick={() => navigate(it.to)}
                  className="hover:text-[#ff5a1f] transition-colors"
                >
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default WestinghouseHeader;
