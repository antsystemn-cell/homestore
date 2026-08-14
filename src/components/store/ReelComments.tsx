import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
};

const ReelComments = ({
  reelId,
  open,
  onClose,
  onCountChange,
}: {
  reelId: string;
  open: boolean;
  onClose: () => void;
  onCountChange?: (n: number) => void;
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("reel_comments")
      .select("id, content, author_name, created_at")
      .eq("reel_id", reelId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const list = (data || []) as Comment[];
        setItems(list);
        onCountChange?.(list.length);
        setLoading(false);
      });
  }, [open, reelId]);

  const send = async () => {
    if (!user) {
      toast.error("Сэтгэгдэл бичихийн тулд нэвтэрнэ үү");
      return;
    }
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const author =
      (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "Хэрэглэгч";
    const { data, error } = await supabase
      .from("reel_comments")
      .insert({ reel_id: reelId, user_id: user.id, author_name: author, content })
      .select("id, content, author_name, created_at")
      .single();
    setSending(false);
    if (error) {
      toast.error("Сэтгэгдэл илгээхэд алдаа гарлаа");
      return;
    }
    const next = [data as Comment, ...items];
    setItems(next);
    onCountChange?.(next.length);
    setText("");
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-background text-foreground rounded-t-2xl max-h-[70%] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Сэтгэгдэл ({items.length})</p>
          <button onClick={onClose} aria-label="Хаах">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">Ачааллаж байна...</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Эхний сэтгэгдлийг үлдээгээрэй</p>
          ) : (
            items.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                  {(c.author_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">{c.author_name || "Хэрэглэгч"}</p>
                  <p className="text-sm break-words">{c.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(c.created_at).toLocaleDateString("mn-MN")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 p-3 border-t border-border pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={user ? "Сэтгэгдэл бичих..." : "Нэвтэрч сэтгэгдэл бичнэ үү"}
            maxLength={500}
            className="flex-1 h-10 rounded-full bg-muted px-4 text-sm outline-none"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
            aria-label="Илгээх"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReelComments;
