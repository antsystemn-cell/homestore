import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, ShoppingCart, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatPrice, type Product } from "@/data/products";
import { Link } from "react-router-dom";

interface ChatProduct {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  original_price: number | null;
  category: string | null;
  image: string | null;
  stock_quantity: number | null;
  url: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: ChatProduct[];
}

interface ChatbotSettings {
  bot_name: string;
  greeting_message: string;
  system_prompt: string;
  is_enabled: boolean;
}

const DEFAULT_SETTINGS: ChatbotSettings = {
  bot_name: "Ээгий",
  greeting_message: "Сайн байна уу? Би easyshop.mn-ийн AI туслах Ээгий байна. Танд юугаар туслах вэ?",
  system_prompt: "Та easyshop.mn онлайн дэлгүүрийн туслах Ээгий. Монгол хэлээр товч, найрсаг хариу өгнө.",
  is_enabled: true,
};

const PRODUCT_MARKER_RE = /\[\[PRODUCT:[0-9a-fA-F-]{8,}\]\]/g;

function renderInline(text: string, keyPrefix: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) out.push(text.slice(lastIdx, match.index));
    if (match[1] && match[2]) {
      out.push(
        <a
          key={`${keyPrefix}-l-${i}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      out.push(<strong key={`${keyPrefix}-b-${i}`}>{match[3]}</strong>);
    }
    lastIdx = match.index + match[0].length;
    i++;
  }
  if (lastIdx < text.length) out.push(text.slice(lastIdx));
  return out;
}

function ProductCard({ product, onAdded }: { product: ChatProduct; onAdded: () => void }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock_quantity != null && product.stock_quantity <= 0;

  const handleAdd = () => {
    if (outOfStock || added) return;
    const p: Product = {
      id: product.id,
      slug: product.slug || product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price,
      image: product.image || "/placeholder.svg",
      image_url: product.image,
      thumbnail: product.image,
      category: product.category || "",
    };
    addToCart(p, null, null, 1, null);
    setAdded(true);
    onAdded();
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="flex gap-3 p-2.5 bg-background border border-border rounded-xl">
      <Link to={product.url} className="flex-shrink-0">
        <img
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          className="h-16 w-16 rounded-lg object-cover bg-secondary"
          loading="lazy"
        />
      </Link>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <Link to={product.url} className="text-xs font-semibold text-foreground line-clamp-2 leading-tight hover:text-primary">
            {product.name}
          </Link>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-foreground">{formatPrice(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
            )}
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={outOfStock || added}
          className={cn(
            "mt-1.5 inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
            outOfStock
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : added
                ? "bg-emerald-500 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {outOfStock ? (
            "Нөөц дууссан"
          ) : added ? (
            <><Check className="h-3 w-3" /> Нэмэгдлээ</>
          ) : (
            <><ShoppingCart className="h-3 w-3" /> Сагсанд нэмэх</>
          )}
        </button>
      </div>
    </div>
  );
}

function renderAssistant(content: string, products: ChatProduct[] | undefined, onAdded: () => void): JSX.Element {
  const productMap = new Map((products || []).map((p) => [p.id, p]));
  // Split content on product markers; render text and cards inline in order
  const pieces: JSX.Element[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const re = /\[\[PRODUCT:([0-9a-fA-F-]{8,})\]\]/g;
  while ((match = re.exec(content)) !== null) {
    const textBefore = content.slice(lastIdx, match.index);
    if (textBefore.trim()) {
      pieces.push(
        <div key={`t-${key++}`} className="space-y-1">
          {textBefore.split("\n").map((line, i) => (
            <div key={i}>{line ? renderInline(line, `${key}-${i}`) : <span>&nbsp;</span>}</div>
          ))}
        </div>,
      );
    }
    const prod = productMap.get(match[1]);
    if (prod) pieces.push(<ProductCard key={`p-${key++}`} product={prod} onAdded={onAdded} />);
    lastIdx = match.index + match[0].length;
  }
  const rest = content.slice(lastIdx);
  if (rest.trim()) {
    pieces.push(
      <div key={`t-end`} className="space-y-1">
        {rest.split("\n").map((line, i) => (
          <div key={i}>{line ? renderInline(line, `end-${i}`) : <span>&nbsp;</span>}</div>
        ))}
      </div>,
    );
  }
  return <div className="space-y-2">{pieces}</div>;
}

export default function ChatbotWidget() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialized) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("chatbot_settings")
        .select("bot_name, greeting_message, system_prompt, is_enabled")
        .eq("id", 1)
        .maybeSingle();
      if (active) setSettings(data ?? DEFAULT_SETTINGS);
    };
    load();

    const channel = supabase
      .channel("chatbot_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot_settings" },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [initialized]);

  const handleOpen = async () => {
    if (!initialized) {
      setInitializing(true);
      setInitialized(true);
    }
    setOpen(true);
  };

  useEffect(() => {
    if (settings && initializing) setInitializing(false);
  }, [settings, initializing]);

  useEffect(() => {
    if (open && messages.length === 0 && settings) {
      setMessages([{ role: "assistant", content: settings.greeting_message }]);
    }
  }, [open, settings, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (initialized && settings && !settings.is_enabled) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newUserMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, newUserMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = next
        .filter((_, idx) => !(idx === 0 && next[0].role === "assistant"))
        .map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("claude-chat", {
        body: {
          messages: apiMessages,
          systemPrompt: settings?.system_prompt ?? DEFAULT_SETTINGS.system_prompt,
          userId: user?.id ?? null,
        },
      });
      if (error) throw error;
      const reply = (data as { reply?: string; products?: ChatProduct[] })?.reply ?? "Уучлаарай, хариу ирсэнгүй.";
      const products = (data as any)?.products as ChatProduct[] | undefined;
      setMessages((prev) => [...prev, { role: "assistant", content: reply, products }]);
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

  const notifyAdded = () => {
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  return (
    <>
      {!open && (
        <button
          onClick={handleOpen}
          aria-label="Чатбот нээх"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] max-h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="font-semibold text-sm">{settings?.bot_name ?? DEFAULT_SETTINGS.bot_name}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Хаах"
              className="h-8 w-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {initializing && !settings && (
            <div className="flex-1 flex items-center justify-center bg-background">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {settings && (
          <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-background relative">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm break-words",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {m.role === "user"
                    ? m.content
                    : renderAssistant(m.content.replace(PRODUCT_MARKER_RE, (s) => s), m.products, notifyAdded)}
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
            {addedToast && (
              <div className="sticky bottom-1 mx-auto w-fit bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-fade-in">
                <Check className="h-3 w-3" /> Сагсанд нэмэгдлээ
              </div>
            )}
          </div>

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
          </>
          )}
        </div>
      )}
    </>
  );
}
