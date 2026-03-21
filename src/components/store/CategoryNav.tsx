import { useState } from "react";

const cats = [
  "Санал болгох",
  "Цахилгаан",
  "Гал тогоо",
  "Гэр ахуй",
  "Хямдрал",
  "Ухаалаг",
  "≡ Ангилал",
];

const CategoryNav = () => {
  const [active, setActive] = useState(0);

  return (
    <div className="flex overflow-x-auto px-4 py-2 bg-background border-b border-border no-scrollbar gap-0">
      {cats.map((c, i) => (
        <button
          key={c}
          onClick={() => setActive(i)}
          className={`whitespace-nowrap px-3 py-2 text-xs font-semibold transition-colors relative ${
            active === i
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {c}
          {active === i && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-foreground rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
};

export default CategoryNav;
