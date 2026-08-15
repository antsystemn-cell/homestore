import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Coins, Wallet, Clock, Copy, Share2, Info, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  useEasyRewards,
  erPointsToMnt,
  ER_STATUS_LABEL,
  ER_SOURCE_LABEL,
} from "@/hooks/useEasyRewards";

const fmt = (n: number) => Math.round(n).toLocaleString("mn-MN");

export default function EasyRewardsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { summary, ledger, loading, enroll } = useEasyRewards();
  const [params] = useSearchParams();
  const [joining, setJoining] = useState(false);

  const pointValue = summary?.point_value_mnt ?? 10;
  const referralLink = useMemo(
    () => (summary?.referral_code ? `${window.location.origin}/?er=${summary.referral_code}` : ""),
    [summary?.referral_code],
  );

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Хуулагдлаа");
  };

  const handleJoin = async () => {
    setJoining(true);
    const error = await enroll(params.get("er") || undefined);
    setJoining(false);
    if (error) {
      toast.error(
        error.message?.includes("not eligible")
          ? "Уучлаарай, та EasyRewards-д хамрагдах шаардлага хангахгүй байна."
          : error.message?.includes("not enabled")
            ? "EasyRewards хараахан идэвхжээгүй байна."
            : "Алдаа гарлаа: " + error.message,
      );
      return;
    }
    toast.success("EasyRewards-д амжилттай нэгдлээ 🎉");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto p-4 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">EasyRewards</h1>
        </div>

        {!user && (
          <div className="rounded-2xl border border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              EasyRewards-ийн оноо болон кредитээ харахын тулд нэвтэрнэ үү.
            </p>
            <Button onClick={() => navigate("/auth")}>Нэвтрэх</Button>
          </div>
        )}

        {user && summary && !summary.enrolled && (
          <div className="rounded-2xl border border-border p-6 text-center space-y-3">
            <Coins className="h-10 w-10 mx-auto text-primary" />
            <h2 className="font-semibold">EasyRewards-д нэгдээрэй</h2>
            <p className="text-sm text-muted-foreground">
              EasyPoints цуглуулж, EasyCredit-ээр хямдрал аваарай. Хуучин урамшууллын системээс
              бүрэн тусдаа, шинэ систем.
            </p>
            {summary.enabled === false ? (
              <p className="text-sm text-muted-foreground">Систем түр идэвхгүй байна.</p>
            ) : summary.eligible === false ? (
              <p className="text-sm text-muted-foreground">
                Таны бүртгэл шинэ системийн шаардлага хангахгүй байна (хуучин урамшуулал ашигласан
                эсвэл нээлтийн өдрөөс өмнө бүртгүүлсэн).
              </p>
            ) : (
              <Button onClick={handleJoin} disabled={joining}>
                {joining && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Нэгдэх
              </Button>
            )}
          </div>
        )}

        {user && summary?.enrolled && (
          <>
            {summary.fraud_status === "review" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 flex gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-600" />
                <p className="text-xs">
                  Таны шагналууд шалгалтад орсон байна. Админ баталгаажуулсны дараа ашиглах
                  боломжтой болно.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5" /> EasyPoints
                </div>
                <p className="text-2xl font-bold mt-1">{fmt(summary.points_balance || 0)}</p>
                <p className="text-xs text-muted-foreground">
                  ≈ {fmt(erPointsToMnt(summary.points_balance || 0, pointValue))}₮
                </p>
                {!!summary.pending_points && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    +{fmt(summary.pending_points)} хүлээгдэж буй
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" /> EasyCredit
                </div>
                <p className="text-2xl font-bold mt-1">{fmt(summary.credit_balance || 0)}₮</p>
                {!!summary.pending_credit && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    +{fmt(summary.pending_credit)}₮ хүлээгдэж буй
                  </p>
                )}
              </div>
            </div>

            {!!summary.expiring_soon?.length && (
              <div className="rounded-2xl border border-border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4" /> Удахгүй хугацаа дуусах
                </div>
                {summary.expiring_soon.map((e, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>
                      {e.currency === "points" ? `${fmt(e.amount)} оноо` : `${fmt(e.amount)}₮ кредит`}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(e.expires_at).toLocaleDateString("mn-MN")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Share2 className="h-4 w-4" /> Найзаа урих
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-secondary/50 rounded-lg px-3 py-2">
                  {summary.referral_code}
                </code>
                <Button size="icon" variant="outline" onClick={() => copy(summary.referral_code!)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="secondary" className="w-full" onClick={() => copy(referralLink)}>
                Урилгын линк хуулах
              </Button>
              <p className="text-xs text-muted-foreground">
                Урьсан найз таны линкээр бүртгүүлж, 50,000₮-с дээш анхны захиалгаа хүлээн авбал:
                тэдэнд 5,000₮ EasyCredit, танд 5,000 EasyPoints.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Гүйлгээний түүх</h2>
              {ledger.length === 0 && (
                <p className="text-xs text-muted-foreground">Одоогоор гүйлгээ алга байна.</p>
              )}
              {ledger.map((e) => (
                <div key={e.id} className="rounded-xl border border-border p-3 flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {ER_SOURCE_LABEL[e.source_type] || e.reason}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("mn-MN")} ·{" "}
                      {ER_STATUS_LABEL[e.status] || e.status}
                      {e.expires_at
                        ? ` · дуусах ${new Date(e.expires_at).toLocaleDateString("mn-MN")}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold whitespace-nowrap ${
                      e.amount >= 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {e.amount >= 0 ? "+" : ""}
                    {fmt(e.amount)}
                    {e.currency === "credit" ? "₮" : " оноо"}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-secondary/40 border border-border p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Info className="h-4 w-4" /> Яаж ашиглах вэ?
              </div>
              <p className="text-xs text-muted-foreground">
                • 1,000₮ тутамд 1 EasyPoint. Захиалга хүргэгдсэний дараа оноо баталгаажна.
              </p>
              <p className="text-xs text-muted-foreground">
                • 100 EasyPoints = 1,000₮ хямдрал.
              </p>
              <p className="text-xs text-muted-foreground">
                • Нэг захиалгад ашиглах нийт хямдрал барааны үнийн{" "}
                {summary.redemption_cap_percent ?? 20}%-иас хэтрэхгүй.
              </p>
              <p className="text-xs text-muted-foreground">
                • EasyCredit хүргэлтийн төлбөр болон бэлгийн картад үйлчлэхгүй.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
