import { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { getEmbedUrl, getAutoThumbnail, detectProvider } from "@/lib/storyVideoUrl";

type StoryVideo = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
};

const StoryReel = () => {
  const [stories, setStories] = useState<StoryVideo[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("story_videos")
        .select("id,title,video_url,thumbnail_url")
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (!error && mounted) setStories(data || []);
    })();
    return () => { mounted = false; };
  }, []);

  const close = useCallback(() => setActiveIdx(null), []);
  const next = useCallback(() => {
    setActiveIdx((i) => (i === null ? null : Math.min(i + 1, stories.length - 1)));
  }, [stories.length]);
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
    <section className="py-4 md:py-6">
      <div className="max-w-6xl mx-auto px-3 md:px-8">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-foreground">Сторис</h2>
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {stories.map((s, i) => {
            const thumb = s.thumbnail_url || getAutoThumbnail(s.video_url) || "/placeholder.svg";
            return (
              <button
                key={s.id}
                onClick={() => setActiveIdx(i)}
                className="group relative flex-shrink-0 w-[110px] md:w-[140px] aspect-[9/16] rounded-2xl overflow-hidden bg-muted ring-2 ring-primary/60 hover:ring-primary transition-all active:scale-95"
                aria-label={`Story: ${s.title}`}
              >
                <img
                  src={thumb}
                  alt={s.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/40 transition-colors">
                    <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-xs md:text-sm font-medium line-clamp-2 drop-shadow-md">{s.title}</p>
                </div>
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

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
              <p className="text-white font-semibold text-base mb-2 line-clamp-2">{active.title}</p>
            </div>

            <a
              href={active.video_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-black text-xs font-medium backdrop-blur transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {detectProvider(active.video_url) === "youtube" ? "YouTube" :
               detectProvider(active.video_url) === "tiktok" ? "TikTok" :
               detectProvider(active.video_url) === "facebook" ? "Facebook" :
               detectProvider(active.video_url) === "instagram" ? "Instagram" : "Эх сурвалж"}
            </a>
          </div>
        </div>
      )}
    </section>
  );
};

export default memo(StoryReel);
