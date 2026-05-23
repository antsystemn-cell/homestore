import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type AdImage = {
  id: string;
  image_url: string;
  link_url: string | null;
  placement: "top" | "middle";
  position: number;
  is_active: boolean;
};

export function useAdImages() {
  const [ads, setAds] = useState<AdImage[]>([]);

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

  return ads;
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
