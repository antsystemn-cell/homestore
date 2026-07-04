import { useState } from "react";
import { Gift, ChevronDown, ChevronUp } from "lucide-react";
import { formatPrice } from "@/data/products";
import { useMyWalletCredits, WalletCredit } from "@/hooks/useWalletCredits";

const labelForType: Record<WalletCredit["credit_type"], string> = {
  welcome: "Тавтай морил",
  referral: "Найз урих",
  wheel: "Хүрд тоглоом",
  manual: "Тусгай урамшуулал",
};

const statusLabel: Record<WalletCredit["status"], string> = {
  active: "Идэвхтэй",
  used: "Ашигласан",
  expired: "Дууссан",
};

const statusColor: Record<WalletCredit["status"], string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  used: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

function fmtValue(c: WalletCredit) {
  if (c.value_type === "percent") return `${c.value}%${c.max_discount_amount ? ` (дээд ${formatPrice(Number(c.max_discount_amount))})` : ""}`;
  return formatPrice(Number(c.value));
}

export default function MyWalletCreditsCard() {
  const { credits, loading } = useMyWalletCredits();
  const [tab, setTab] = useState<"active" | "used" | "expired">("active");
  const [expanded, setExpanded] = useState(true);

  const filtered = credits.filter((c) => {
    const isExpiredByTime = c.expires_at && new Date(c.expires_at) < new Date() && c.status === "active";
    const effective = isExpiredByTime ? "expired" : c.status;
    return effective === tab;
  });

  const activeCount = credits.filter((c) => c.status === "active" && (!c.expires_at || new Date(c.expires_at) > new Date())).length;

  return (
    <div className="rounded-2xl p-4 md:p-5 bg-card border border-border">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium">Миний урамшуулал</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {activeCount > 0 ? `${activeCount} идэвхтэй урамшуулал` : "Одоогоор идэвхтэй урамшуулал алга"}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-3">
          <div className="flex gap-1 mb-3 bg-muted/50 rounded-lg p-1">
            {(["active", "used", "expired"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${tab === t ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              >
                {statusLabel[t]}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Уншиж байна...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Хоосон</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium">{labelForType[c.credit_type]}</span>
                      <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded ${statusColor[c.status]}`}>{statusLabel[c.status]}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {fmtValue(c)}
                      {c.min_order_amount ? ` · Мин ${formatPrice(Number(c.min_order_amount))}` : ""}
                      {c.expires_at ? ` · Хугацаа: ${new Date(c.expires_at).toLocaleDateString("mn-MN")}` : ""}
                    </p>
                    {c.note && <p className="text-[10px] text-muted-foreground italic mt-0.5">{c.note}</p>}
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {c.value_type === "fixed" ? formatPrice(Number(c.value)) : `${c.value}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
