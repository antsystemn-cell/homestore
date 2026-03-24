import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Phone, CreditCard, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/data/products";

type StorepayStep = "phone" | "checking" | "eligible" | "creating" | "waiting" | "paid" | "failed";

interface StorepayPaymentProps {
  amount: number;
  orderId?: string;
  type?: "ORDER" | "WALLET_TOPUP";
  description?: string;
  onSuccess: (intentId: string) => void;
  onCancel: () => void;
}

export default function StorepayPayment({
  amount,
  orderId,
  type = "ORDER",
  description,
  onSuccess,
  onCancel,
}: StorepayPaymentProps) {
  const [step, setStep] = useState<StorepayStep>("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [loanId, setLoanId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const validatePhone = (val: string) => {
    if (!val) return "Утасны дугаараа оруулна уу";
    if (!/^\d{8}$/.test(val)) return "8 оронтой тоо оруулна уу";
    return "";
  };

  const handleCheckEligibility = async () => {
    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }
    setPhoneError("");
    setStep("checking");
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("storepay", {
        body: { action: "eligibility", phone },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setEligibility(data);
      if (data.eligible && data.possibleAmount >= amount) {
        setStep("eligible");
      } else {
        setStep("failed");
        setErrorMsg(data.message || "Зээлийн эрх хүрэлцэхгүй");
      }
    } catch (e: any) {
      setStep("failed");
      setErrorMsg(e.message || "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async () => {
    setStep("creating");
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("storepay", {
        body: {
          action: "create-loan",
          phone,
          amount,
          description: description || "Захиалгын төлбөр",
          orderId,
          type,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setIntentId(data.intentId);
      setLoanId(data.loanId);
      setStep("waiting");
      startPolling(data.intentId);
    } catch (e: any) {
      setStep("failed");
      setErrorMsg(e.message || "Нэхэмжлэл үүсгэхэд алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = useCallback((id: string) => {
    setPollCount(0);
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      setPollCount((c) => {
        if (c >= 60) {
          // 5 min timeout (60 * 5s)
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStep("failed");
          setErrorMsg("Төлбөр баталгаажаагүй. Дахин оролдоно уу.");
          return c;
        }
        return c + 1;
      });

      try {
        const { data } = await supabase.functions.invoke("storepay", {
          body: { action: "check-status", intentId: id },
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
  }, [onSuccess]);

  const handleRetry = () => {
    setStep("phone");
    setEligibility(null);
    setErrorMsg("");
    setIntentId(null);
    setLoanId(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#00B140]/10 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-[#00B140]" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Storepay</h3>
          <p className="text-xs text-muted-foreground">Хуваан төлөх үйлчилгээ</p>
        </div>
      </div>

      {/* Step: Phone input */}
      {(step === "phone" || step === "checking") && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Утасны дугаар
          </label>
          <input
            type="tel"
            maxLength={8}
            placeholder="Жишээ: 99112233"
            value={phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 8);
              setPhone(val);
              if (phoneError) setPhoneError(validatePhone(val));
            }}
            disabled={step === "checking"}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          {phoneError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {phoneError}
            </p>
          )}
          <Button
            onClick={handleCheckEligibility}
            disabled={step === "checking" || !phone}
            className="w-full rounded-xl h-11 gap-2"
          >
            {step === "checking" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Шалгаж байна...
              </>
            ) : (
              "Эрх шалгах"
            )}
          </Button>
        </div>
      )}

      {/* Step: Eligible */}
      {step === "eligible" && eligibility && (
        <div className="space-y-3">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Та Storepay-ээр худалдан авалт хийх боломжтой
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Боломжит лимит: {formatPrice(eligibility.possibleAmount)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <span className="text-sm text-muted-foreground">Төлөх дүн</span>
            <span className="text-lg font-bold text-foreground">{formatPrice(amount)}</span>
          </div>
          <Button
            onClick={handleCreateLoan}
            disabled={loading}
            className="w-full rounded-xl h-12 text-base gap-2 bg-[#00B140] hover:bg-[#009930] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Үүсгэж байна...
              </>
            ) : (
              "Нэхэмжлэл үүсгэх"
            )}
          </Button>
        </div>
      )}

      {/* Step: Creating */}
      {step === "creating" && (
        <div className="flex flex-col items-center py-6 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B140]" />
          <p className="text-sm text-muted-foreground">Нэхэмжлэл үүсгэж байна...</p>
        </div>
      )}

      {/* Step: Waiting for payment */}
      {step === "waiting" && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Таны Storepay-д нэхэмжлэл илгээгдлээ
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Storepay апп руугаа нэвтэрч төлбөрөө баталгаажуулна уу
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Төлбөр хүлээгдэж байна... ({pollCount * 5}с)
            </span>
          </div>

          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full rounded-xl"
          >
            Цуцлах
          </Button>
        </div>
      )}

      {/* Step: Paid */}
      {step === "paid" && (
        <div className="flex flex-col items-center py-6 gap-3">
          <CheckCircle className="h-12 w-12 text-green-600" />
          <p className="text-base font-semibold text-foreground">Төлбөр амжилттай!</p>
          <p className="text-sm text-muted-foreground text-center">
            Storepay-ээр төлбөр амжилттай баталгаажлаа
          </p>
        </div>
      )}

      {/* Step: Failed */}
      {step === "failed" && (
        <div className="space-y-3">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300">
                {errorMsg || "Алдаа гарлаа"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRetry}
              className="flex-1 rounded-xl"
            >
              Дахин оролдох
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 rounded-xl"
            >
              Цуцлах
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
