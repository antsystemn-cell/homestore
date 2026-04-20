// Гадаад видео линкийг embed/thumbnail руу хөрвүүлдэг туслах
export type StoryProvider = "youtube" | "tiktok" | "facebook" | "instagram" | "other";

export const detectProvider = (url: string): StoryProvider => {
  if (!url) return "other";
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  return "other";
};

const getYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
};

export const getEmbedUrl = (url: string): string | null => {
  const provider = detectProvider(url);
  if (provider === "youtube") {
    const id = getYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0` : null;
  }
  if (provider === "tiktok") {
    const m = url.match(/\/video\/(\d+)/);
    if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
  }
  if (provider === "facebook") {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`;
  }
  if (provider === "instagram") {
    const cleaned = url.split("?")[0].replace(/\/$/, "");
    return `${cleaned}/embed`;
  }
  return null;
};

export const getAutoThumbnail = (url: string): string | null => {
  const provider = detectProvider(url);
  if (provider === "youtube") {
    const id = getYoutubeId(url);
    // maxresdefault = HD; fallback нь <img onError>-оор хийгдэнэ
    return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null;
  }
  return null;
};

// YouTube thumbnail аль нэг хэмжээ ажиллахгүй бол доорх хувилбар руу шилжих
export const getYoutubeThumbnailFallback = (url: string): string | null => {
  const id = getYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
};
