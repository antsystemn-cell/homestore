import { useState } from "react";
import { Sparkles, Zap, ChefHat, Sofa, Tag, BrainCircuit, LayoutGrid } from "lucide-react";

const cats = [
  { label: "Санал болгох", icon: Sparkles },
  { label: "Цахилгаан", icon: Zap },
  { label: "Гал тогоо", icon: ChefHat },
  { label: "Гэр ахуй", icon: Sofa },
  { label: "Хямдрал", icon: Tag },
  { label: "Ухаалаг", icon: BrainCircuit },
  { label: "Ангилал", icon: LayoutGrid },
];

const CategoryNav = () => {
  const [active, setActive] = useState(0);

  return (
    <div className="flex overflow-x-auto px-3 py-2.5 bg-background border-b border-border no-scrollbar gap-1.5">
      {cats.map((c, i) => {
        const Icon = c.icon;
        const isActive = active === i;
        return (
          <button
            key={c.label}
            onClick={() => setActive(i)}
            className={`whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-full transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {c.label}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryNav;