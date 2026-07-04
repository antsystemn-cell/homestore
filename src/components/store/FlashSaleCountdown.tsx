import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  endsAt: string;
  className?: string;
  compact?: boolean;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function computeRemaining(endsAt: string): { h: number; m: number; s: number; total: number } {
  const end = new Date(endsAt).getTime();
  const total = Math.max(0, end - Date.now());
  const s = Math.floor(total / 1000);
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, total };
}

const FlashSaleCountdown = ({ endsAt, className = "", compact = false }: Props) => {
  const [t, setT] = useState(() => computeRemaining(endsAt));

  useEffect(() => {
    setT(computeRemaining(endsAt));
    const id = window.setInterval(() => setT(computeRemaining(endsAt)), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (t.total <= 0) return null;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-destructive/10 text-destructive text-[10px] md:text-xs font-bold px-1.5 py-0.5 tabular-nums ${className}`}
        aria-label="Flash sale үлдсэн хугацаа"
      >
        <Clock className="h-3 w-3" />
        {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm font-bold px-3 py-1.5 tabular-nums ${className}`}
    >
      <Clock className="h-4 w-4" />
      <span>{pad(t.h)}:{pad(t.m)}:{pad(t.s)} үлдлээ</span>
    </div>
  );
};

export default FlashSaleCountdown;
