import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentProvider {
  id: string;
  name: string;
  logo_url: string | null;
  color: string;
  icon: string;
  position: number;
}

interface PromoBannerData {
  id: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
}

const PromoBanner = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [banner, setBanner] = useState<PromoBannerData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [provRes, bannerRes] = await Promise.all([
        supabase.from("payment_providers").select("*").eq("is_active", true).order("position"),
        supabase.from("promo_banners").select("*").eq("is_active", true).order("position").limit(1),
      ]);
      if (provRes.data) setProviders(provRes.data as any);
      if (bannerRes.data && bannerRes.data.length > 0) setBanner(bannerRes.data[0] as any);
    };
    fetchData();
  }, []);

  if (!banner) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(265,80%,45%)] via-[hsl(270,75%,40%)] to-[hsl(280,70%,30%)] p-6 md:p-10 min-h-[220px] md:min-h-[280px]">
          {/* Decorative swirl lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-96 h-40 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full bg-purple-300/10 blur-2xl" />
          </div>

          <div className="relative z-10 flex flex-col justify-center h-full">
            <h2 className="text-white text-2xl md:text-4xl font-extrabold leading-tight">
              {banner.title}
            </h2>
            {banner.subtitle && (
              <p className="text-white/80 text-sm md:text-base mt-1.5">
                {banner.subtitle}
              </p>
            )}
            {banner.button_text && (
              <button
                onClick={() => navigate(banner.button_link || "/shop")}
                className="mt-4 w-fit px-5 py-2 rounded-full bg-white text-foreground text-sm font-semibold hover:bg-white/90 transition-colors shadow-md"
              >
                {banner.button_text}
              </button>
            )}
          </div>
        </div>

        {/* Payment Providers */}
        {providers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 transition-all duration-200 hover:bg-primary/10 hover:shadow-md cursor-pointer"
              >
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.name} className="w-8 h-8 rounded-full object-contain flex-shrink-0" />
                ) : (
                  <div className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center text-white text-sm flex-shrink-0`}>
                    {p.icon}
                  </div>
                )}
                <span className="text-[11px] font-medium text-foreground leading-tight whitespace-nowrap">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PromoBanner;
