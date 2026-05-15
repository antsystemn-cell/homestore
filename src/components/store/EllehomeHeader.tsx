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
    <section className="w-full bg-white">
      <img
        src={bannerImg}
        alt="Elle Home"
        className="w-full h-auto block"
        loading="eager"
        decoding="async"
      />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 text-center">
        <h1
          className="font-black tracking-tight text-foreground leading-none text-5xl md:text-8xl"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          ELLE HOME МОНГОЛ
        </h1>
      </div>
    </section>
  );
};

export default EllehomeHeader;
