// Fetch real thumbnail from TikTok/Facebook/Instagram/YouTube using oEmbed or og:image scraping
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Provider = "youtube" | "tiktok" | "facebook" | "instagram" | "other";

const detectProvider = (url: string): Provider => {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  return "other";
};

const getYoutubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
  );
  return m && m[1] ? m[1] : null;
};

// Decode HTML entities like &amp; &quot; &#x2F;
const decodeHtml = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

// Fetch HTML and parse og:image / twitter:image meta tag
const scrapeOgImage = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        // Бот биш гэж танигдахын тулд жинхэнэ браузерын UA илгээнэ
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // og:image эсвэл twitter:image хайна
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m && m[1]) return decodeHtml(m[1]);
    }
    return null;
  } catch (e) {
    console.error("scrapeOgImage error", e);
    return null;
  }
};

const fetchTikTokThumbnail = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      // Fallback: og:image scraping
      return await scrapeOgImage(url);
    }
    const data = await res.json();
    return data.thumbnail_url || (await scrapeOgImage(url));
  } catch (e) {
    console.error("TikTok oEmbed failed", e);
    return await scrapeOgImage(url);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { video_url } = await req.json();
    if (!video_url || typeof video_url !== "string") {
      return new Response(
        JSON.stringify({ error: "video_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const provider = detectProvider(video_url);
    let thumbnail: string | null = null;

    if (provider === "youtube") {
      const id = getYoutubeId(video_url);
      thumbnail = id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null;
    } else if (provider === "tiktok") {
      thumbnail = await fetchTikTokThumbnail(video_url);
    } else if (provider === "facebook" || provider === "instagram") {
      // Эдгээр платформ нь App Token шаарддаг тул og:image scraping ашиглана
      thumbnail = await scrapeOgImage(video_url);
    } else {
      thumbnail = await scrapeOgImage(video_url);
    }

    return new Response(
      JSON.stringify({ thumbnail_url: thumbnail, provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-video-thumbnail error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
