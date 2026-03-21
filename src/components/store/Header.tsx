import { Search } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 bg-background px-4 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Бараа хайх..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full bg-secondary pl-4 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border border-border"
          />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <button className="shrink-0 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-xs font-bold">
          Хайх
        </button>
      </div>
    </header>
  );
};

export default Header;
