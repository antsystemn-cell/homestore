import React from "react";

interface Props {
  logoUrl?: string | null;
}

const BrandBanner: React.FC<Props> = ({ logoUrl }) => {
  if (!logoUrl) return null;

  return (
    <div className="w-full bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30 border-b border-border/50 overflow-hidden flex items-center justify-center py-12 md:py-20 shadow-sm">
      <img
        src={logoUrl}
        alt=""
        className="max-h-20 md:max-h-32 w-auto object-contain"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

export default BrandBanner;
