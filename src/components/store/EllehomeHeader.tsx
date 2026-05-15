import React from "react";
import bannerImg from "@/assets/ellehome-banner.png";

interface Props {
  title?: string;
  count?: number;
  sort?: string;
  onSortChange?: (v: string) => void;
}

const EllehomeHeader: React.FC<Props> = () => {
  return (
    <section className="w-full">
      <img
        src={bannerImg}
        alt="Elle Home"
        className="w-full h-auto block"
        loading="eager"
        decoding="async"
      />
    </section>
  );
};

export default EllehomeHeader;
