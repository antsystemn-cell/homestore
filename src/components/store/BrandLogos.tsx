import { useNavigate } from "react-router-dom";

interface Brand {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface BrandLogosProps {
  brands: Brand[];
}

const BrandLogos = ({ brands }: BrandLogosProps) => {
  const navigate = useNavigate();
  const displayed = brands.slice(0, 6);

  if (displayed.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {displayed.map((brand) => (
          <button
            key={brand.id}
            onClick={() => navigate(`/${encodeURIComponent(brand.name)}`)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all group"
          >
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-12 w-12 object-contain rounded-lg"
                loading="lazy"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground group-hover:text-primary transition-colors">
                {brand.name.charAt(0)}
              </div>
            )}
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-full">
              {brand.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BrandLogos;
