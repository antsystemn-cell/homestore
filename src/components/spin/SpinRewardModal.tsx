import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Gift, Ticket, Sparkles, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { REWARD_LABEL, type SpinResult } from "@/lib/spinApi";

function useCountdown(target: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return { text: "", expired: true, ms: 0 };
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { text: "Дууссан", expired: true, ms: 0 };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { text: `${String(h).padStart(2, "0")}ц ${String(m).padStart(2, "0")}м ${String(s).padStart(2, "0")}с`, expired: false, ms };
}

interface Props {
  open: boolean;
  onClose: () => void;
  result: SpinResult | null;
}

export default function SpinRewardModal({ open, onClose, result }: Props) {
  const { text, expired, ms } = useCountdown(result?.expires_at ?? null);
  if (!result) return null;

  const isCoupon = ["coupon_5k", "coupon_10k", "coupon_50k"].includes(result.reward_type);
  const isGiftSelect = result.reward_type === "gift_select";
  const isFreeGift = result.reward_type === "free_gift";
  const isExtra = result.reward_type === "extra_spin";

  const Icon = isExtra ? Sparkles : isFreeGift || isGiftSelect ? Gift : Ticket;
  const accent = isExtra
    ? "from-blue-500 to-indigo-500"
    : result.reward_type === "coupon_50k"
    ? "from-purple-500 to-pink-500"
    : isFreeGift
    ? "from-red-500 to-orange-500"
    : isGiftSelect
    ? "from-pink-500 to-rose-500"
    : "from-amber-500 to-yellow-500";

  const urgency = ms > 0 && ms < 60 * 60 * 1000;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 gap-0">
        <div className={`bg-gradient-to-br ${accent} text-white p-6 text-center relative`}>
          <div className="absolute inset-0 opacity-20 pointer-events-none"
               style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <PartyPopper className="h-8 w-8 mx-auto mb-2 animate-bounce" />
          <p className="text-sm opacity-90">Баяр хүргэе! Та хожлоо</p>
          <h2 className="text-2xl font-bold mt-1">{REWARD_LABEL[result.reward_type]}</h2>
          {result.reward_value > 0 && !isExtra && (
            <p className="text-4xl font-extrabold mt-2">{result.reward_value.toLocaleString()}₮</p>
          )}
        </div>

        <div className="p-6 space-y-4">
          {isCoupon && result.coupon_code && (
            <>
              <div className="border-2 border-dashed border-primary rounded-xl p-4 text-center bg-primary/5">
                <p className="text-xs text-muted-foreground mb-1">Купон код</p>
                <p className="font-mono text-2xl font-bold tracking-wider text-primary">{result.coupon_code}</p>
                <Button
                  variant="ghost" size="sm" className="mt-2"
                  onClick={() => { navigator.clipboard.writeText(result.coupon_code!); toast.success("Хуулагдлаа"); }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Хуулах
                </Button>
              </div>
              <Instructions
                steps={[
                  "Сагсандаа барааг нэмнэ",
                  `Захиалгын дүн ${result.minimum_order_amount.toLocaleString()}₮ хүрсэн байх`,
                  "Төлбөр төлөх хуудсанд купон кодоо оруулна",
                  "Хямдрал автоматаар тооцоологдоно",
                ]}
              />
            </>
          )}

          {isGiftSelect && result.coupon_code && (
            <>
              <div className="border-2 border-dashed border-pink-500 rounded-xl p-4 text-center bg-pink-50 dark:bg-pink-950/20">
                <p className="text-xs text-muted-foreground mb-1">Бэлгийн код</p>
                <p className="font-mono text-2xl font-bold tracking-wider text-pink-600">{result.coupon_code}</p>
                <Button
                  variant="ghost" size="sm" className="mt-2"
                  onClick={() => { navigator.clipboard.writeText(result.coupon_code!); toast.success("Хуулагдлаа"); }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Хуулах
                </Button>
              </div>
              <Instructions
                steps={[
                  `Захиалгын дүн ${result.minimum_order_amount.toLocaleString()}₮-аас дээш байх`,
                  "Төлбөр төлөх хуудсанд бэлгийн кодоо оруулна",
                  "Жагсаалтаас бэлэг сонгоно",
                  "Бэлэг сагсанд 0₮-өөр нэмэгдэнэ",
                ]}
              />
            </>
          )}

          {isFreeGift && (
            <>
              <div className="border-2 border-dashed border-red-500 rounded-xl p-4 text-center bg-red-50 dark:bg-red-950/20">
                <p className="text-xs text-muted-foreground mb-1">Үнэгүй бэлэг</p>
                {result.coupon_code && (
                  <p className="font-mono text-2xl font-bold tracking-wider text-red-600">{result.coupon_code}</p>
                )}
                <p className="text-xs mt-2 text-muted-foreground">Сонгогдсон бараа автоматаар бэлэглэгдэнэ</p>
              </div>
              <Instructions
                steps={[
                  "Төлбөр төлөх хуудсанд бэлгийн кодоо оруулна",
                  "Бэлэг сагсанд 0₮-өөр нэмэгдэнэ",
                  "Захиалгаа баталгаажуулна",
                ]}
              />
            </>
          )}

          {isExtra && (
            <div className="text-center py-2">
              <p className="text-base">Таны азаа үзэх эрх <span className="font-bold text-primary">+1</span> нэмэгдлээ.</p>
              <p className="text-xs text-muted-foreground mt-1">5 цагийн дотор ашиглана уу.</p>
            </div>
          )}

          {!isExtra && (
            <div className={`rounded-lg p-3 text-center ${urgency ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
              <p className="text-xs opacity-80">Дуусах хугацаа</p>
              <p className={`text-lg font-bold ${urgency ? "animate-pulse" : ""}`}>{expired ? "Дууссан" : text}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Хаах</Button>
            {!isExtra && !isCoupon && !expired && (
              <Button className="flex-1" asChild>
                <Link to="/cart">Сагс руу</Link>
              </Button>
            )}
            {isExtra && (
              <Button className="flex-1" onClick={onClose}>Үргэлжлүүлэх</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Instructions({ steps }: { steps: string[] }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs font-semibold mb-2">Хэрхэн ашиглах вэ?</p>
      <ol className="space-y-1.5 text-xs">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
