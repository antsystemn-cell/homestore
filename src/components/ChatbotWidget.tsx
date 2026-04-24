import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatbotSettings {
  bot_name: string;
  greeting_message: string;
  system_prompt: string;
  is_enabled: boolean;
}

const DEFAULT_SETTINGS: ChatbotSettings = {
  bot_name: "Эйси",
  greeting_message: "Сайн байна уу! Танд юугаар туслах вэ?",
  system_prompt: "Та easyshop.mn онлайн дэлгүүрийн туслах ажилтан. Монгол хэлээр товч хариулна уу.",
  is_enabled: true,
};

export default function ChatbotWidget() {
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("chatbot_settings")
        .select("bot_name, greeting_message, system_prompt, is_enabled")
        .eq("id", 1)
        .maybeSingle();
      if (active) setSettings(data ?? DEFAULT_SETTINGS);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (open && messages.length === 0 && settings) {
      setMessages([{ role: "assistant", content: settings.greeting_message }]);
    }
  }, [open, settings, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (!settings || !settings.is_enabled) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newUserMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, newUserMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = next.filter((_, idx) => !(idx === 0 && next[0].role === "assistant"));
      const { data, error } = await supabase.functions.invoke("claude-chat", {
        body: { messages: apiMessages, systemPrompt: settings.system_prompt },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "Уучлаарай, хариу ирсэнгүй.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Алдаа гарлаа. Дахин оролдоно уу." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Чатбот нээх"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] max-h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="font-semibold text-sm">{settings.bot_name}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Хаах"
              className="h-8 w-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-background">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Бичиж байна...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2 border-t border-border bg-card flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Мессеж бичих..."
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
