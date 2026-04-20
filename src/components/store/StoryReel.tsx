import { useEffect, useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Play, X, ExternalLink, ChevronLeft, ChevronRight, ShoppingBag, Film } from "lucide-react";
import { getEmbedUrl, getAutoThumbnail, getYoutubeThumbnailFallback, detectProvider } from "@/lib/storyVideoUrl";

type StoryVideo = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  product_id: string | null;
  product?: { slug: string; name: string } | null;
};

const StoryReel = () => {
  const [stories, setStories] = useState<StoryVideo[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("story_videos")
        .select("id,title,video_url,thumbnail_url,product_id,product:products(slug,name)")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (!error && mounted) setStories((data as any) || []);
    })();
    return () => { mounted = false; };
  }, []);

  const openStory = useCallback((idx: number) => {
    setActiveIdx(idx);
    const s = stories[idx];
    if (s?.id) {
      supabase.rpc("increment_story_view", { _story_id: s.id }).then(() => {});
    }
  }, [stories]);

  const close = useCallback(() => setActiveIdx(null), []);
  const next = useCallback(() => {
    setActiveIdx((i) => {
      if (i === null) return null;
      const newIdx = Math.min(i + 1, stories.length - 1);
      if (newIdx !== i) {
        const s = stories[newIdx];
        if (s?.id) supabase.rpc("increment_story_view", { _story_id: s.id }).then(() => {});
      }
      return newIdx;
    });
  }, [stories]);
  const prev = useCallback(() => {
    setActiveIdx((i) => (i === null || i === 0 ? i : i - 1));
  }, []);

  useEffect(() => {
    if (activeIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeIdx, close, next, prev]);

  if (stories.length === 0) return null;

  const active = activeIdx !== null ? stories[activeIdx] : null;
  const embedUrl = active ? getEmbedUrl(active.video_url) : null;

  return (
    <section className="py-5 md:py-8">
      <div className="max-w-6xl mx-auto px-3 md:px-8">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Film className="w-6 h-6 md:w-7 md:h-7 text-foreground" strokeWidth={2.5} />
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Reels</h2>
        </div>
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
          {stories.map((s, i) => {
            const previewUrl = getEmbedUrl(s.video_url);
            return (
              <button
                key={s.id}
                onClick={() => openStory(i)}
                className="group relative flex-shrink-0 w-[230px] md:w-[270px] aspect-[3/4] overflow-hidden bg-muted rounded-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98] snap-start"
                aria-label={`Story: ${s.title}`}
              >
                {previewUrl ? (
                  <iframe
                    src={previewUrl.replace("autoplay=1", "autoplay=1&mute=1&controls=0&loop=1")}
                    className="w-full h-full pointer-events-none"
                    allow="autoplay; encrypted-media"
                    title={s.title}
                    loading="lazy"
                    tabIndex={-1}
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-2 md:p-4 animate-in fade-in" onClick={close}>
          <button
            onClick={close}
            className="absolute top-3 right-3 md:top-5 md:right-5 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-colors"
            aria-label="Хаах"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {activeIdx !== null && activeIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 md:left-5 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-colors"
              aria-label="Өмнөх"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
          )}
          {activeIdx !== null && activeIdx < stories.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 md:right-5 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-colors"
              aria-label="Дараагийн"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
          )}

          <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                title={active.title}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white p-6 text-center gap-4">
                <p className="text-sm opacity-80">Энэ видеог сайт дотор тоглуулах боломжгүй.</p>
                <a
                  href={active.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium"
                >
                  <ExternalLink className="w-4 h-4" /> Видео үзэх
                </a>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
              <p className="text-white font-semibold text-base mb-2 line-clamp-2 pointer-events-none">{active.title}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {active.product_id && active.product?.slug && (
                  <Link
                    to={`/product/${active.product.slug}`}
                    onClick={(e) => { e.stopPropagation(); close(); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Энэ бараа руу очих
                  </Link>
                )}
                <a
                  href={active.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-black text-xs font-medium backdrop-blur transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {detectProvider(active.video_url) === "youtube" ? "YouTube" :
                   detectProvider(active.video_url) === "tiktok" ? "TikTok" :
                   detectProvider(active.video_url) === "facebook" ? "Facebook" :
                   detectProvider(active.video_url) === "instagram" ? "Instagram" : "Эх сурвалж"}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default memo(StoryReel);
