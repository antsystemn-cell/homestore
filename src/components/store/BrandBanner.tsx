import React from "react";

interface Props {
  logoUrl?: string | null;
}

const BrandBanner: React.FC<Props> = ({ logoUrl }) => {
  if (!logoUrl) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
      <div className="w-full rounded-2xl bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30 border border-border/50 overflow-hidden flex items-center justify-center py-12 md:py-16 shadow-lg backdrop-blur-sm">
        <img
          src={logoUrl}
          alt=""
          className="max-h-16 md:max-h-24 w-auto object-contain"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );
};

export default BrandBanner;
