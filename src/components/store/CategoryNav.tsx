import { Home, Zap, ChefHat, Sofa, Tag, Grid3X3 } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  ChefHat: <ChefHat className="h-5 w-5" />,
  Sofa: <Sofa className="h-5 w-5" />,
  Tag: <Tag className="h-5 w-5" />,
  Grid3X3: <Grid3X3 className="h-5 w-5" />,
};

const cats = [
  { label: "Нүүр", icon: "Home" },
  { label: "Цахилгаан бараа", icon: "Zap" },
  { label: "Гал тогоо", icon: "ChefHat" },
  { label: "Гэр ахуй", icon: "Sofa" },
  { label: "Хямдрал", icon: "Tag" },
  { label: "Ангилал", icon: "Grid3X3" },
];

const CategoryNav = () => (
  <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
    {cats.map((c) => (
      <button
        key={c.label}
        className="flex flex-col items-center gap-1 min-w-[60px] rounded-xl bg-accent p-2.5 text-accent-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        {iconMap[c.icon]}
        <span className="text-[10px] font-medium whitespace-nowrap">{c.label}</span>
      </button>
    ))}
  </div>
);

export default CategoryNav;
