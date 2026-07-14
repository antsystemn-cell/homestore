import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Announcement {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
}

const STORAGE_KEY = "seen_announcements_v1";

// Track shown IDs by day so we show once per day
function getSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function markSeen(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  const seen = getSeen();
  seen[id] = today;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
}

const AnnouncementModal = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const nowIso = new Date().toISOString();
        const { data } = await supabase
          .from("announcements")
          .select("id,title,subtitle,body,image_url,button_text,button_link,starts_at,ends_at")
          .eq("is_active", true)
          .order("position", { ascending: true })
          .limit(10);

        if (!data || data.length === 0) return;

        const seen = getSeen();
        const today = new Date().toISOString().slice(0, 10);

        const eligible = data.find((a: any) => {
          if (a.starts_at && a.starts_at > nowIso) return false;
          if (a.ends_at && a.ends_at < nowIso) return false;
          if (seen[a.id] === today) return false;
          return true;
        });

        if (eligible) {
          setTimeout(() => {
            setAnnouncement(eligible as Announcement);
            setOpen(true);
          }, 600);
        }
      } catch (err) {
        console.error("AnnouncementModal fetch failed", err);
      }
    };
    load();
  }, []);

  const handleClose = () => {
    if (announcement) markSeen(announcement.id);
    setOpen(false);
  };

  const handleAction = () => {
    if (!announcement) return;
    markSeen(announcement.id);
    setOpen(false);
    if (announcement.button_link) {
      if (announcement.button_link.startsWith("http")) {
        window.open(announcement.button_link, "_blank");
      } else {
        navigate(announcement.button_link);
      }
    }
  };

  if (!open || !announcement) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-background rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur transition-colors"
          aria-label="Хаах"
        >
          <X className="h-5 w-5" />
        </button>

        {announcement.image_url && (
          <div className="w-full aspect-[4/3] bg-muted overflow-hidden">
            <img
              src={announcement.image_url}
              alt={announcement.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-3">
          {announcement.subtitle && (
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {announcement.subtitle}
            </p>
          )}
          <h2 className="text-2xl font-bold leading-tight text-foreground">
            {announcement.title}
          </h2>
          {announcement.body && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {announcement.body}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            {announcement.button_text && announcement.button_link && (
              <button
                onClick={handleAction}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                {announcement.button_text}
              </button>
            )}
            <button
              onClick={handleClose}
              className="h-11 px-5 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-accent transition-colors"
            >
              Хаах
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
