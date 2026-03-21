const cats = [
  { label: "Нүүр" },
  { label: "Цахилгаан бараа" },
  { label: "Гал тогоо" },
  { label: "Гэр ахуй" },
  { label: "Хямдрал" },
  { label: "Ангилал" },
];

const CategoryNav = () => (
  <div className="sticky top-0 z-50 flex gap-1 overflow-x-auto px-4 py-3 bg-primary no-scrollbar">
    {cats.map((c) => (
      <button
        key={c.label}
        className="rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
      >
        {c.label}
      </button>
    ))}
  </div>
);

export default CategoryNav;
