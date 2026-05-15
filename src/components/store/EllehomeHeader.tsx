import React from "react";

interface Props {
  title?: string;
  count?: number;
  sort?: string;
  onSortChange?: (v: string) => void;
}

const EllehomeHeader: React.FC<Props> = ({
  title = "Elle Home Series",
  count = 0,
  sort = "default",
  onSortChange,
}) => {
  const fontStyle = { fontFamily: "'ModernMTStd-Extended', 'Times New Roman', Georgia, serif" } as const;

  return (
    <section className="w-full bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-end gap-4 flex-wrap">
          <h1
            className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-none"
            style={fontStyle}
          >
            {title}
          </h1>
          <p
            className="text-base md:text-lg text-muted-foreground pb-1"
            style={fontStyle}
          >
            Showing all {count} results
          </p>
        </div>

        <div className="md:self-end">
          <div className="relative inline-block">
            <select
              value={sort}
              onChange={(e) => onSortChange?.(e.target.value)}
              style={mulish}
              className="appearance-none bg-secondary text-foreground rounded-md pl-5 pr-10 py-3 text-sm md:text-base font-medium focus:outline-none cursor-pointer min-w-[200px]"
            >
              <option value="default">Default sorting</option>
              <option value="name-asc">Name: A → Z</option>
              <option value="name-desc">Name: Z → A</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EllehomeHeader;
