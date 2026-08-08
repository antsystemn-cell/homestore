import { Search, Clock, X, ArrowUpRight, LogIn, ChevronDown, LayoutGrid, Tag, Layers, Star, Store, Sparkles, User, Menu, LogOut, Package, History, Heart, UserCircle } from "lucide-react";
import NotificationsBell from "./NotificationsBell";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Product, mapDbProduct } from "@/data/products";
import { searchPublicProducts, fetchPublicCategories, fetchPublicBrands } from "@/lib/publicStoreApi";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useAuth } from "@/context/AuthContext";
import easyshopLogo from "@/assets/easyshop-logo.png.asset.json";
import * as Icons from "lucide-react";

const DEBOUNCE_MS = 300;
const SUGGEST_DEBOUNCE_MS = 150;
const HISTORY_KEY = "easyshop:searchHistory";
const HISTORY_MAX = 8;
const SUGGEST_MAX = 8;

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
  const [suggestQuery, setSuggestQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState<"cats" | "brands">("cats");

  useEffect(() => {
    setHistory(loadHistory());
    fetchPublicCategories().then(setCategories);
    fetchPublicBrands().then(setBrands);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

    // Debounce product search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), DEBOUNCE_MS);

    // Debounce autocomplete suggestions
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(() => setSuggestQuery(value.trim()), SUGGEST_DEBOUNCE_MS);
  };

  const pickHistory = (value: string) => {
    setQuery(value);
    setSuggestQuery(value.trim());
    pushHistory(value);
    doSearch(value);
  };

  const trimmed = query.trim();
  const suggestTrimmed = suggestQuery.trim();
  const showFullHistory = showResults && !trimmed && history.length > 0;
  const filteredHistory = suggestTrimmed
    ? history
      .filter((item) => item.toLowerCase().includes(suggestTrimmed.toLowerCase()))
      .slice(0, SUGGEST_MAX)
    : [];
  const showSuggestions = showResults && suggestTrimmed && filteredHistory.length > 0;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div
        className={`max-w-6xl mx-auto px-4 md:px-8 flex items-center gap-4 md:gap-8 transition-[padding] duration-300 ease-out ${
          collapsed ? "py-1.5 md:py-3" : "py-3"
        }`}
      >
        <button
          onClick={() => navigate("/")}
          aria-label="EasyShop"
          className={`cursor-pointer shrink-0 overflow-hidden transition-all duration-300 ease-out md:!max-w-none md:!opacity-100 md:!ml-0 ${
            collapsed
              ? "max-w-0 opacity-0 -ml-4"
              : "max-w-[180px] opacity-100 ml-0"
          }`}
        >
          <img
            src={easyshopLogo.url}
            alt="EasyShop"
            className={`w-auto object-contain transition-all duration-300 ease-out md:h-9 ${
              collapsed ? "h-6" : "h-8"
            }`}
            loading="eager"
            decoding="async"
          />
        </button>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground mr-auto">
          <div className="relative group">
            <button 
              onMouseEnter={() => setShowMenu(true)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors py-2"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Ангилал</span>
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showMenu ? "rotate-180" : ""}`} />
            </button>
            
            
            {showMenu && (
              <div 
                className="fixed inset-0 z-[100] md:hidden"
                onClick={() => setShowMenu(false)}
              >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col h-[70vh]">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <h2 className="text-lg font-bold">Цэс</h2>
                      <button onClick={() => setShowMenu(false)} className="p-2 rounded-full hover:bg-secondary">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 pb-20">
                      <div className="flex bg-secondary/30 rounded-xl p-1 mb-6">
                        <button 
                          onClick={() => setActiveMenuTab("cats")}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeMenuTab === 'cats' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                          <Layers className="h-4 w-4" /> Ангилал
                        </button>
                        <button 
                          onClick={() => setActiveMenuTab("brands")}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeMenuTab === 'brands' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                          <Store className="h-4 w-4" /> Брэндүүд
                        </button>
                      </div>

                      {activeMenuTab === "cats" ? (
                        <div className="space-y-6">
                          {categories.filter(c => !c.parent_id).map(parent => (
                            <div key={parent.id} className="space-y-3">
                              <button 
                                onClick={() => { navigate(`/category/${parent.slug}`); setShowMenu(false); }}
                                className="text-sm font-bold text-foreground flex items-center gap-2"
                              >
                                {parent.icon && (() => {
                                  const Icon = (Icons as any)[parent.icon] || LayoutGrid;
                                  return <Icon className="h-4 w-4 text-primary" />;
                                })()}
                                {parent.name}
                              </button>
                              <div className="grid grid-cols-2 gap-2 pl-6">
                                {categories.filter(c => c.parent_id === parent.id).map(child => (
                                  <button 
                                    key={child.id}
                                    onClick={() => { navigate(`/category/${child.slug}`); setShowMenu(false); }}
                                    className="text-left py-1 text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    {child.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {brands.map(b => (
                            <button 
                              key={b.id}
                              onClick={() => { navigate(`/${b.name.replace(/\s+/g, '')}`); setShowMenu(false); }}
                              className="flex flex-col items-center gap-2 p-2 rounded-xl border border-border bg-card shadow-sm"
                            >
                              <div className="h-10 w-10 flex items-center justify-center overflow-hidden">
                                {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <span className="text-[9px] font-bold text-center truncate w-full">{b.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}


            {showMenu && (
              <div 
                onMouseLeave={() => setShowMenu(false)}
                className="absolute top-full left-0 w-[600px] bg-card rounded-2xl border border-border shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 hidden md:block"
              >
                <div className="flex h-[400px]">
                  <div className="w-48 bg-secondary/30 border-r border-border p-2 space-y-1">
                    <button 
                      onMouseEnter={() => setActiveMenuTab("cats")}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeMenuTab === 'cats' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:bg-background/50'}`}
                    >
                      <Layers className="h-4 w-4" /> Ангилал
                    </button>
                    <button 
                      onMouseEnter={() => setActiveMenuTab("brands")}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeMenuTab === 'brands' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:bg-background/50'}`}
                    >
                      <Store className="h-4 w-4" /> Брэндүүд
                    </button>
                    <div className="pt-4 px-4">
                      <button 
                        onClick={() => { navigate("/sales"); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 py-2 text-xs font-bold text-destructive hover:opacity-80 transition-opacity"
                      >
                        <Tag className="h-4 w-4" /> Хямдралтай
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-background">
                    {activeMenuTab === "cats" ? (
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        {categories.filter(c => !c.parent_id).map(parent => (
                          <div key={parent.id} className="space-y-3">
                            <button 
                              onClick={() => { navigate(`/category/${parent.slug}`); setShowMenu(false); }}
                              className="text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                            >
                              {parent.icon && (() => {
                                const Icon = (Icons as any)[parent.icon] || LayoutGrid;
                                return <Icon className="h-4 w-4 text-primary" />;
                              })()}
                              {parent.name}
                            </button>
                            <div className="space-y-2 pl-6">
                              {categories.filter(c => c.parent_id === parent.id).map(child => (
                                <button 
                                  key={child.id}
                                  onClick={() => { navigate(`/category/${child.slug}`); setShowMenu(false); }}
                                  className="block text-xs text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all"
                                >
                                  {child.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        {brands.map(b => (
                          <button 
                            key={b.id}
                            onClick={() => { navigate(`/${b.name.replace(/\s+/g, '')}`); setShowMenu(false); }}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-transparent hover:border-border hover:bg-secondary/20 transition-all group"
                          >
                            <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                              {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain" /> : <Store className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <span className="text-[10px] font-bold text-center truncate w-full">{b.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-secondary/20 border-t border-border p-3 flex justify-end">
                  <button 
                    onClick={() => { navigate("/shop"); setShowMenu(false); }}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    Бүх барааг үзэх <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>



        <div ref={searchBoxRef} className="relative flex-1 max-w-md ml-auto transition-all duration-300 ease-out">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Бараа хайх..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowResults(true)}
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

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2">
            <NotificationsBell />
            <button 
              onClick={() => {
                setActiveMenuTab("cats"); // Reuse state to avoid issues
                setShowMenu(true);
              }}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              title="Профайл"
            >
              <User className="h-5 w-5" />
            </button>

          </div>

          {/* Mobile Profile Toggle */}
          <div className="flex md:hidden items-center gap-1">
            <button 
              onClick={() => {
                setActiveMenuTab("cats"); // Default to categories for this toggle
                setShowMenu(true);
              }}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
               <Menu className="h-6 w-6" />
            </button>
          </div>


          {/* Mobile Profile Drawer */}
          {showMenu && (
            <div 
              className="fixed inset-0 z-[100] md:hidden"
              onClick={() => setShowMenu(false)}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div 
                className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col h-[85vh]">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-bold">Профайл / Цэс</h2>
                    <button onClick={() => setShowMenu(false)} className="p-2 rounded-full hover:bg-secondary">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 pb-20 scrollbar-hide">
                    <div className="flex bg-secondary/30 rounded-xl p-1 mb-6 sticky top-0 z-10 backdrop-blur-md">
                      <button 
                        onClick={() => setActiveMenuTab("cats")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeMenuTab === 'cats' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                      >
                        <Layers className="h-4 w-4" /> Ангилал
                      </button>
                      <button 
                        onClick={() => setActiveMenuTab("brands")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeMenuTab === 'brands' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                      >
                        <Store className="h-4 w-4" /> Брэндүүд
                      </button>
                    </div>

                    {activeMenuTab === "cats" ? (
                      <div className="space-y-6 mb-8">
                        {categories.filter(c => !c.parent_id).map(parent => (
                          <div key={parent.id} className="space-y-3">
                            <button 
                              onClick={() => { navigate(`/category/${parent.slug}`); setShowMenu(false); }}
                              className="text-sm font-bold text-foreground flex items-center gap-2"
                            >
                              {parent.icon && (() => {
                                const Icon = (Icons as any)[parent.icon] || LayoutGrid;
                                return <Icon className="h-4 w-4 text-primary" />;
                              })()}
                              {parent.name}
                            </button>
                            <div className="grid grid-cols-2 gap-2 pl-6">
                              {categories.filter(c => c.parent_id === parent.id).map(child => (
                                <button 
                                  key={child.id}
                                  onClick={() => { navigate(`/category/${child.slug}`); setShowMenu(false); }}
                                  className="text-left py-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  {child.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 mb-8">
                        {brands.map(b => (
                          <button 
                            key={b.id}
                            onClick={() => { navigate(`/${b.name.replace(/\s+/g, '')}`); setShowMenu(false); }}
                            className="flex flex-col items-center gap-2 p-2 rounded-xl border border-border bg-card shadow-sm"
                          >
                            <div className="h-10 w-10 flex items-center justify-center overflow-hidden">
                              {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <span className="text-[9px] font-bold text-center truncate w-full">{b.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="h-px bg-border my-6" />

                    {user ? (

                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-2xl mb-6">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-sm truncate">{user.user_metadata?.full_name || "Хэрэглэгч"}</p>
                            <p className="text-[10px] text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => { navigate("/profile/details"); setShowMenu(false); }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-secondary transition-colors"
                        >
                          <UserCircle className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">Миний мэдээлэл</span>
                        </button>
                        
                        <button 
                          onClick={() => { navigate("/orders"); setShowMenu(false); }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-secondary transition-colors"
                        >
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">Захиалгын түүх</span>
                        </button>

                        <button 
                          onClick={() => { navigate("/wishlist"); setShowMenu(false); }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-secondary transition-colors"
                        >
                          <Heart className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">Хадгалсан</span>
                        </button>

                        <div className="pt-4 mt-4 border-t border-border">
                          <button 
                            onClick={() => { signOut(); setShowMenu(false); }}
                            className="w-full flex items-center gap-3 p-4 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <LogOut className="h-5 w-5" />
                            <span className="text-sm font-medium">Гарах</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold mb-2">Нэвтрэх</h3>
                        <p className="text-sm text-muted-foreground mb-6">Захиалга хийх болон хүслийн жагсаалтаа хадгалахын тулд нэвтэрнэ үү.</p>
                        <button 
                          onClick={() => { navigate("/auth"); setShowMenu(false); }}
                          className="w-full py-3 rounded-xl bg-black text-white font-bold"
                        >
                          Нэвтрэх
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          )}

          {/* Desktop Login */}
          {!user && (
            <button
              onClick={() => {
                sessionStorage.setItem("returnAfterAuth", location.pathname + location.search);
                navigate("/auth");
              }}
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-4 w-4" />
              <span>Нэвтрэх</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
