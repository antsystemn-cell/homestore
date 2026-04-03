import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, QrCode, RefreshCw } from "lucide-react";
import { formatPrice } from "@/data/products";
import { ScrollArea } from "@/components/ui/scroll-area";

type QPayStep = "creating" | "qr" | "paid" | "failed";

interface BankApp {
  name: string;
  description: string;
  logo: string;
  link: string;
}

interface QPayPaymentProps {
  orderId: string;
  amount: number;
  onSuccess: (intentId: string) => void;
  onCancel: () => void;
}

export default function QPayPayment({ orderId, amount, onSuccess, onCancel }: QPayPaymentProps) {
  const [step, setStep] = useState<QPayStep>("creating");
  const [qrImage, setQrImage] = useState<string>("");
  const [bankApps, setBankApps] = useState<BankApp[]>([]);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Create invoice on mount
  useEffect(() => {
    createInvoice();
  }, []);

  const createInvoice = async () => {
    setStep("creating");
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("qpay", {
        body: { action: "create-invoice", orderId },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setIntentId(data.intentId);
      setQrImage(data.qrImage);

      // Parse bank apps from urls
      const apps: BankApp[] = [];
      if (data.urls && Array.isArray(data.urls)) {
        for (const urlObj of data.urls) {
          apps.push({
            name: urlObj.name || "",
            description: urlObj.description || "",
            logo: urlObj.logo || "",
            link: urlObj.link || "",
          });
        }
      }
      setBankApps(apps);
      setStep("qr");
      startPolling(data.intentId);
    } catch (e: any) {
      setStep("failed");
      setErrorMsg(e.message || "QPay нэхэмжлэл үүсгэхэд алдаа гарлаа");
    }
  };

  const startPolling = useCallback(
    (id: string) => {
      setPollCount(0);
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(async () => {
        setPollCount((c) => {
          if (c >= 60) {
            // 5 min timeout
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("failed");
            setErrorMsg("Төлбөр баталгаажаагүй. Хугацаа дууссан.");
            return c;
          }
          return c + 1;
        });

        try {
          const { data } = await supabase.functions.invoke("qpay", {
            body: { action: "check-payment", intentId: id },
          });

          if (data?.status === "PAID") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("paid");
            onSuccess(id);
          }
        } catch {
          // Continue polling
        }
      }, 5000);
    },
    [onSuccess]
  );

  const handleRetry = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    createInvoice();
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <QrCode className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">QPay</h3>
          <p className="text-xs text-muted-foreground">QR кодоор төлөх</p>
        </div>
      </div>

      {/* Creating */}
      {step === "creating" && (
        <div className="flex flex-col items-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Нэхэмжлэл үүсгэж байна...</p>
        </div>
      )}

      {/* QR Display */}
      {step === "qr" && (
        <div className="space-y-4">
          {/* Amount */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <span className="text-sm text-muted-foreground">Төлөх дүн</span>
            <span className="text-lg font-bold text-foreground">{formatPrice(amount)}</span>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <img
                src={`data:image/png;base64,${qrImage}`}
                alt="QPay QR Code"
                className="w-48 h-48 md:w-56 md:h-56"
              />
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Банкны апп-аар QR кодыг уншуулж төлбөрөө хийнэ үү
          </p>

          {/* Bank Apps - dynamic from QPay */}
          {bankApps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Банкны апп сонгох:</p>
              <ScrollArea className="max-h-[240px]">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {bankApps.map((app, idx) => (
                    <a
                      key={idx}
                      href={app.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-colors"
                    >
                      <img
                        src={app.logo}
                        alt={app.name}
                        className="w-10 h-10 rounded-lg object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="text-[10px] text-center text-muted-foreground leading-tight line-clamp-2">
                        {app.name}
                      </span>
                    </a>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Polling status */}
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

      {/* Paid */}
      {step === "paid" && (
        <div className="flex flex-col items-center py-6 gap-3">
          <CheckCircle className="h-12 w-12 text-green-600" />
          <p className="text-base font-semibold text-foreground">Төлбөр амжилттай!</p>
          <p className="text-sm text-muted-foreground text-center">
            QPay-ээр төлбөр амжилттай баталгаажлаа
          </p>
        </div>
      )}

      {/* Failed */}
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
