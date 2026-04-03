import React from "react";

interface Props {
  logoUrl?: string | null;
}

const BrandBanner: React.FC<Props> = ({ logoUrl }) => {
  if (!logoUrl) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
      <div className="w-full rounded-2xl bg-card border border-border overflow-hidden flex items-center justify-center py-10 md:py-14">
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
