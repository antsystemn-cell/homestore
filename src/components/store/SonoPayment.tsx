import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, QrCode, RefreshCw } from "lucide-react";
import { formatPrice } from "@/data/products";

type SonoStep = "creating" | "qr" | "paid" | "failed";

interface SonoPaymentProps {
  orderId: string;
  amount: number;
  onSuccess: (intentId: string) => void;
  onCancel: () => void;
}

export default function SonoPayment({ orderId, amount, onSuccess, onCancel }: SonoPaymentProps) {
  const [step, setStep] = useState<SonoStep>("creating");
  const [qrString, setQrString] = useState<string>("");
  const [intentId, setIntentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    createInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      setPollCount(0);
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        setPollCount((c) => {
          if (c >= 60) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("failed");
            setErrorMsg("Төлбөр баталгаажаагүй. Хугацаа дууссан.");
            return c;
          }
          return c + 1;
        });
        try {
          const { data } = await supabase.functions.invoke("sono", {
            body: { action: "check-payment", intentId: id },
          });
          if (data?.status === "PAID") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("paid");
            onSuccess(id);
          } else if (data?.status === "FAILED") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("failed");
            setErrorMsg("Нэхэмжлэлийн хугацаа дууссан байна");
          }
        } catch {
          /* continue */
        }
      }, 5000);
    },
    [onSuccess]
  );

  const createInvoice = async () => {
    setStep("creating");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("sono", {
        body: { action: "create-invoice", orderId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setIntentId(data.intentId);
      setQrString(data.qrString);
      setStep("qr");
      startPolling(data.intentId);
    } catch (e: any) {
      setStep("failed");
      setErrorMsg(e.message || "Sono нэхэмжлэл үүсгэхэд алдаа гарлаа");
    }
  };

  const handleRetry = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    createInvoice();
  };

  // qr_string is already a full data URL: "data:image/png;base64,..."
  const qrSrc = qrString.startsWith("data:") ? qrString : `data:image/png;base64,${qrString}`;

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#F25C2A]/10 flex items-center justify-center">
          <QrCode className="h-5 w-5 text-[#F25C2A]" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Sono</h3>
          <p className="text-xs text-muted-foreground">Sono апп-аар хуваан төлөх</p>
        </div>
      </div>

      {step === "creating" && (
        <div className="flex flex-col items-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#F25C2A]" />
          <p className="text-sm text-muted-foreground">Нэхэмжлэл үүсгэж байна...</p>
        </div>
      )}

      {step === "qr" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <span className="text-sm text-muted-foreground">Төлөх дүн</span>
            <span className="text-lg font-bold text-foreground">{formatPrice(amount)}</span>
          </div>

          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <img
                src={qrSrc}
                alt="Sono QR Code"
                className="w-48 h-48 md:w-56 md:h-56"
              />
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Sono апп нээж QR кодыг уншуулна уу
          </p>

          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Төлбөр хүлээгдэж байна... ({pollCount * 5}с)
            </span>
          </div>

          <Button variant="outline" onClick={onCancel} className="w-full rounded-xl">
            Цуцлах
          </Button>
        </div>
      )}

      {step === "paid" && (
        <div className="flex flex-col items-center py-6 gap-3">
          <CheckCircle className="h-12 w-12 text-green-600" />
          <p className="text-base font-semibold text-foreground">Төлбөр амжилттай!</p>
          <p className="text-sm text-muted-foreground text-center">
            Sono-р төлбөр амжилттай баталгаажлаа
          </p>
        </div>
      )}

      {step === "failed" && (
        <div className="space-y-3">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{errorMsg || "Алдаа гарлаа"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRetry} className="flex-1 rounded-xl gap-2">
              <RefreshCw className="h-4 w-4" />
              Дахин оролдох
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
              Цуцлах
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
