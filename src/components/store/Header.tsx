import { Search, Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

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
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl bg-secondary pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
        />
      </div>
    </header>
  );
};

export default Header;
