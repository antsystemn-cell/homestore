import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-primary px-4 py-3 safe-bottom">
      <div className="flex items-center gap-3">
        <h1
          className="text-lg font-bold text-primary-foreground cursor-pointer shrink-0"
          onClick={() => navigate("/")}
        >
          HomeStore
        </h1>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Бараа хайх..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
