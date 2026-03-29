import { useEffect, useState, useCallback, useRef } from "react";
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
  banner_image: string | null;
}

const SLIDE_DURATION = 5000; // 5 seconds per banner

const PromoBanner = () => {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [banners, setBanners] = useState<PromoBannerData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const fetchData = async () => {
      const [provRes, bannerRes] = await Promise.all([
        supabase.from("payment_providers").select("*").eq("is_active", true).order("position"),
        supabase.from("promo_banners").select("*").eq("is_active", true).order("position"),
      ]);
      if (provRes.data) setProviders(provRes.data as any);
      if (bannerRes.data && bannerRes.data.length > 0) setBanners(bannerRes.data as any);
    };
    fetchData();
  }, []);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
    setProgress(0);
    startTimeRef.current = Date.now();
  }, []);

  // Auto-rotate and progress bar
  useEffect(() => {
    if (banners.length <= 1) return;

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);

      if (elapsed >= SLIDE_DURATION) {
        setActiveIndex((prev) => (prev + 1) % banners.length);
        startTimeRef.current = Date.now();
        setProgress(0);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, activeIndex]);

  if (banners.length === 0) return null;

  const banner = banners[activeIndex];

  return (
    <section className="py-4 md:py-6">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(30,100%,50%)] via-[hsl(340,100%,55%)] to-[hsl(260,60%,55%)] min-h-[200px] sm:min-h-[240px] md:min-h-[280px] shadow-lg">
          {/* Banner image */}
          {banner.banner_image && (
            <img
              src={banner.banner_image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover brightness-110 saturate-[1.25] contrast-[1.08] transition-opacity duration-500"
            />
          )}
          {/* Decorative overlay */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {!banner.banner_image && (
              <>
                <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-96 h-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
              </>
            )}
            {banner.banner_image && <div className="absolute inset-0 bg-black/12" />}
          </div>

          <div className="relative z-10 flex flex-col justify-center h-full" />

          {/* Slide indicators with progress */}
          {banners.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
                  style={{ width: i === activeIndex ? 32 : 12 }}
                >
                  <div className="absolute inset-0 bg-white/40 rounded-full" />
                  {i === activeIndex && (
                    <div
                      className="absolute inset-y-0 left-0 bg-white rounded-full transition-none"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  {i !== activeIndex && (
                    <div className="absolute inset-0 bg-white/40 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment Providers */}
        {providers.length > 0 && (
          <div className="mt-3 <div className="mt-3 grid grid-cols-6 gap-1.5 md:gap-2">">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex flex-col items-center justify-center gap-1.5 bg-secondary rounded-xl py-3 px-2 transition-all duration-200 hover:bg-primary/10 hover:shadow-md cursor-pointer"
              >
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.name} className="w-10 h-10 rounded-full object-contain flex-shrink-0" />
                ) : (
                  <div className={`w-10 h-10 rounded-full ${p.color} flex items-center justify-center text-white text-base flex-shrink-0`}>
                    {p.icon}
                  </div>
                )}
                <span className="text-[11px] font-medium text-foreground leading-tight text-center line-clamp-1">
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
