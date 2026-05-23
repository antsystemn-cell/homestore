import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type AdDevice = "all" | "mobile" | "tablet" | "desktop";

export type AdImage = {
  id: string;
  image_url: string;
  link_url: string | null;
  placement: "top" | "middle";
  device: AdDevice;
  position: number;
  is_active: boolean;
};

/** Detect current device based on viewport width (matches Tailwind md/lg). */
function getCurrentDevice(): AdDevice {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function useAdImages() {
  const [ads, setAds] = useState<AdImage[]>([]);
  const [device, setDevice] = useState<AdDevice>(getCurrentDevice());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("ad_images" as any)
          .select("*")
          .eq("is_active", true)
          .order("position");
        if (!cancelled) setAds(((data as any[]) || []) as AdImage[]);
      } catch {
        if (!cancelled) setAds([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onResize = () => setDevice(getCurrentDevice());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return ads.filter((a) => !a.device || a.device === "all" || a.device === device);
}

const AdItem = ({ ad }: { ad: AdImage }) => {
  const img = (
    <img
      src={ad.image_url}
      alt="Зар"
      loading="lazy"
      className="w-full h-auto rounded-2xl object-cover"
    />
  );
  if (!ad.link_url) return <div className="w-full">{img}</div>;
  const isExternal = /^https?:\/\//i.test(ad.link_url);
  if (isExternal) {
    return (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="block w-full">
        {img}
      </a>
    );
  }
  return (
    <Link to={ad.link_url} className="block w-full">
      {img}
    </Link>
  );
};

type Props = { ads: AdImage[]; className?: string };

const AdBanners = ({ ads, className }: Props) => {
  if (!ads || ads.length === 0) return null;
  return (
    <div className={`px-4 md:px-6 max-w-7xl mx-auto space-y-3 my-4 ${className || ""}`}>
      {ads.map((a) => (
        <AdItem key={a.id} ad={a} />
      ))}
    </div>
  );
};

export default AdBanners;
