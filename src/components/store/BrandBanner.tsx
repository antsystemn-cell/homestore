import React from "react";
import { useDominantColor } from "@/hooks/useDominantColor";
import { blendModeForColor } from "@/lib/dominantColor";

interface Props {
  logoUrl?: string | null;
}

const BrandBanner: React.FC<Props> = ({ logoUrl }) => {
  const dominant = useDominantColor(logoUrl);
  const blend = blendModeForColor(dominant);

  if (!logoUrl) return null;

  return (
    <div
      className={`w-full border-b border-border/50 overflow-hidden flex items-center justify-center py-12 md:py-20 shadow-sm isolate ${
        dominant ? "" : "bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30"
      }`}
      style={dominant ? { backgroundColor: dominant } : undefined}
    >
      <img
        src={logoUrl}
        alt=""
        className="max-h-20 md:max-h-32 w-auto object-contain"
        loading="eager"
        decoding="async"
        style={{ mixBlendMode: blend }}
      />
    </div>
  );
};

export default BrandBanner;
