import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { formatPrice } from "@/data/products";
import omniwayLogo from "@/assets/omniway-logo.png.asset.json";


type Step = "creating" | "qr" | "paid" | "failed";

interface OmniWayPaymentProps {
  orderId: string;
  amount: number;
  onSuccess: (intentId: string) => void;
  onCancel: () => void;
}

const BRAND = "#0F9D58";

export default function OmniWayPayment({ orderId, amount, onSuccess, onCancel }: OmniWayPaymentProps) {
  const [step, setStep] = useState<Step>("creating");
  const [qrContent, setQrContent] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [intentId, setIntentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const t = setTimeout(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => {
      clearTimeout(t);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);


  const startPolling = useCallback(
    (id: string) => {
      setPollCount(0);
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        setPollCount((c) => {
          if (c >= 120) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("failed");
            setErrorMsg("Төлбөр баталгаажаагүй. Хугацаа дууссан.");
            return c;
          }
          return c + 1;
        });
        try {
          const { data } = await supabase.functions.invoke("omniway", {
            body: { action: "check-payment", intentId: id },
          });
          if (data?.status === "PAID") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("paid");
            onSuccess(id);
          } else if (data?.status === "FAILED") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("failed");
            setErrorMsg("Нэхэмжлэх цуцлагдсан байна");
          }
        } catch {
          /* keep polling */
        }
      }, 5000);
    },
    [onSuccess]
  );

  const createInvoice = useCallback(async () => {
    setStep("creating");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("omniway", {
        body: { action: "create-invoice", orderId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.status === "PAID") {
        setStep("paid");
        onSuccess(data.intentId);
        return;
      }

      setIntentId(data.intentId);
      setQrContent(data.qrContent || "");
      setImageBase64(data.imageBase64 || "");
      setStep("qr");
      startPolling(data.intentId);
    } catch (e: any) {
      setStep("failed");
      setErrorMsg(e?.message || "OmniWay нэхэмжлэх үүсгэхэд алдаа гарлаа");
    }
  }, [orderId, onSuccess, startPolling]);

  useEffect(() => {
    createInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (intentId) {
      try {
        await supabase.functions.invoke("omniway", { body: { action: "cancel-invoice", intentId } });
      } catch {
        /* ignore */
      }
    }
    onCancel();
  };

  const qrSrc = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;

  return (
    <div ref={rootRef} id="omniway-payment" className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4 scroll-mt-24">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/40">
          <img src={omniwayLogo.url} alt="OmniWay" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">OmniWay</h3>
          <p className="text-xs text-muted-foreground">OmniWay апп-аар төлөх</p>
        </div>
      </div>

      {step === "creating" && (
        <div className="flex flex-col items-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND }} />
          <p className="text-sm text-muted-foreground">Нэхэмжлэх үүсгэж байна...</p>
        </div>
      )}

      {step === "qr" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <span className="text-sm text-muted-foreground">Төлөх дүн</span>
            <span className="text-lg font-bold text-foreground">{formatPrice(amount)}</span>
          </div>

          {imageBase64 && (
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <img src={qrSrc} alt="OmniWay QR код" className="w-48 h-48 md:w-56 md:h-56" />
              </div>
            </div>
          )}

          {qrContent && (
            <Button
              asChild={false}
              onClick={() => { window.location.href = qrContent; }}
              className="w-full h-12 rounded-xl gap-2 text-white"
              style={{ backgroundColor: BRAND }}
            >
              <Smartphone className="h-4 w-4" />
              OmniWay апп нээх
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground">
            {isMobile
              ? "Дээрх товчийг дарж OmniWay апп-аар төлнө үү"
              : "OmniWay апп нээж QR кодыг уншуулна уу"}
          </p>

          <div className="flex items-center justify-center gap-2 py-1">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Төлбөр хүлээгдэж байна... ({pollCount * 5}с)</span>
          </div>

          <Button variant="outline" onClick={handleCancel} className="w-full rounded-xl">
            Цуцлах
          </Button>
        </div>
      )}

      {step === "paid" && (
        <div className="flex flex-col items-center py-6 gap-3">
          <CheckCircle className="h-12 w-12 text-green-600" />
          <p className="text-base font-semibold text-foreground">Төлбөр амжилттай!</p>
          <p className="text-sm text-muted-foreground text-center">OmniWay-ээр төлбөр баталгаажлаа</p>
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
            <Button variant="outline" onClick={createInvoice} className="flex-1 rounded-xl gap-2">
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
