import { useEffect, useMemo } from "react";
import { Gift, AlertCircle } from "lucide-react";
import { formatPrice } from "@/data/products";
import { WalletCredit, computeCreditDiscount, pickBestCredit, useMyWalletCredits } from "@/hooks/useWalletCredits";

interface Props {
  subtotal: number;
  hasFlashSaleItems: boolean;
  selectedCreditId: string | null;
  onSelect: (id: string | null, credit: WalletCredit | null, discount: number) => void;
}

const labelForType: Record<WalletCredit["credit_type"], string> = {
  welcome: "Тавтай морил",
  referral: "Найз урих",
  wheel: "Хүрд тоглоом",
  manual: "Тусгай урамшуулал",
};

export default function WalletCreditsSection({ subtotal, hasFlashSaleItems, selectedCreditId, onSelect }: Props) {
  const { credits, loading } = useMyWalletCredits();

  const activeCredits = useMemo(
    () => credits.filter((c) => c.status === "active" && (!c.expires_at || new Date(c.expires_at) > new Date())),
    [credits]
  );

  // Auto-suggest best credit once when list loads
  useEffect(() => {
    if (loading || hasFlashSaleItems || selectedCreditId !== null) return;
    const best = pickBestCredit(activeCredits, subtotal);
    if (best) {
      const d = computeCreditDiscount(best, subtotal);
      if (d > 0) onSelect(best.id, best, d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasFlashSaleItems]);

  // If flash sale items present, clear any selection
  useEffect(() => {
    if (hasFlashSaleItems && selectedCreditId) onSelect(null, null, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFlashSaleItems]);

  if (loading || activeCredits.length === 0) return null;

  return (
    <div className="border-t border-border pt-2">
      <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
        <Gift className="h-3.5 w-3.5 text-primary" />
        Урамшуулал ашиглах ({activeCredits.length})
      </p>

      {hasFlashSaleItems ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border p-2 text-[11px] text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>Хямдралтай (Flash Sale / 1+1) бараанд купон хэрэглэх боломжгүй.</span>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          <label className="flex items-center gap-2 text-xs p-1.5 rounded border border-border cursor-pointer hover:bg-accent/30">
            <input
              type="radio"
              name="wallet-credit"
              checked={selectedCreditId === null}
              onChange={() => onSelect(null, null, 0)}
            />
            <span className="flex-1 text-muted-foreground">Ашиглахгүй</span>
          </label>
          {activeCredits.map((c) => {
            const d = computeCreditDiscount(c, subtotal);
            const eligible = d > 0;
            const checked = selectedCreditId === c.id;
            return (
              <label
                key={c.id}
                className={`flex items-center gap-2 text-xs p-1.5 rounded border ${
                  eligible ? "border-border cursor-pointer hover:bg-accent/30" : "border-border opacity-50 cursor-not-allowed"
                }`}
              >
                <input
                  type="radio"
                  name="wallet-credit"
                  disabled={!eligible}
                  checked={checked && eligible}
                  onChange={() => eligible && onSelect(c.id, c, d)}
                />
                <span className="flex-1 truncate">
                  <span className="font-medium">{labelForType[c.credit_type]}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {c.value_type === "percent"
                      ? `${c.value}% хямдрал${c.max_discount_amount ? ` (дээд ${formatPrice(Number(c.max_discount_amount))})` : ""}`
                      : `${formatPrice(Number(c.value))}`}
                    {c.min_order_amount ? ` · Мин: ${formatPrice(Number(c.min_order_amount))}` : ""}
                  </span>
                </span>
                <span className="font-semibold text-primary">-{formatPrice(d)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
