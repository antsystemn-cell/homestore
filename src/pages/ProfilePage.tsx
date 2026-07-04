import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, LogOut, Shield, User, MapPin, Phone, ShoppingBag, Heart, Settings, Sparkles } from "lucide-react";
import BottomNav from "@/components/store/BottomNav";
import Header from "@/components/store/Header";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";

const REWARD_STEP = 1000; // 1000 points = 1000₮ discount

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isModerator, signOut, loading, authError } = useAuth();
  const [points, setPoints] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("loyalty_points")
        .eq("user_id", user.id)
        .maybeSingle();
      setPoints((data as any)?.loyalty_points ?? 0);
    })();
  }, [user]);

  const nextTier = Math.max(REWARD_STEP, (Math.floor(points / REWARD_STEP) + 1) * REWARD_STEP);
  const pointsToNext = Math.max(0, nextTier - points);
  const progress = Math.min(100, Math.round(((points % REWARD_STEP) / REWARD_STEP) * 100));

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Уншиж байна...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <header className="sticky top-0 z-50 bg-background px-4 py-4 border-b border-border md:hidden hidden">
          <h1 className="text-lg font-bold">Профайл</h1>
        </header>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground max-w-md mx-auto px-4 text-center">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-2">{authError ? "Сүлжээний алдаа гарлаа" : "Нэвтрээгүй байна"}</p>
          <p className="text-xs text-muted-foreground mb-4">
            {authError ? "Нэвтрэлтийн мэдээлэл шалгаж чадсангүй. Дахин оролдоно уу." : "Аккаунтаараа нэвтэрч үргэлжлүүлнэ үү."}
          </p>
          <button
            onClick={() => authError ? window.location.reload() : navigate("/auth")}
            className="bg-primary text-primary-foreground rounded-xl px-8 py-3 text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            {authError ? "Дахин оролдох" : "Нэвтрэх / Бүртгүүлэх"}
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const menuItems = [
    
    { label: "Захиалгууд", desc: "Миний бүх захиалгууд", icon: ShoppingBag, onClick: () => {} },
    { label: "Таалагдсан", desc: "Хадгалсан бараанууд", icon: Heart, onClick: () => navigate("/wishlist") },
    { label: "Хаяг", desc: "Хүргэлтийн хаяг", icon: MapPin, onClick: () => {} },
    { label: "Утасны дугаар", desc: "Холбоо барих мэдээлэл", icon: Phone, onClick: () => {} },
    { label: "Тохиргоо", desc: "Аккаунт тохиргоо", icon: Settings, onClick: () => {} },
    ...((isAdmin || isModerator) ? [{ label: "Админ удирдлага", desc: "Дэлгүүр удирдах", icon: Shield, onClick: () => navigate("/admin") }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background px-4 py-4 border-b border-border md:hidden hidden">
        <h1 className="text-lg font-bold">Профайл</h1>
      </header>

      <div className="max-w-4xl mx-auto md:py-12 md:px-8">
        {/* Desktop Header */}
        <h1 className="hidden md:block text-2xl font-bold mb-8">Миний профайл</h1>

        <div className="md:grid md:grid-cols-3 md:gap-8">
          {/* Profile Card */}
          <div className="px-4 py-6 md:px-0 md:py-0 md:col-span-1">
            <div className="md:bg-card md:rounded-2xl md:border md:border-border md:p-6 md:sticky md:top-20">
              <div className="flex items-center gap-4 md:flex-col md:text-center">
                <div className="h-14 w-14 md:h-20 md:w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl md:text-2xl font-bold">
                  {(user.user_metadata?.full_name || user.email || "?")[0].toUpperCase()}
                </div>
                <div className="md:mt-4">
                  <p className="font-bold text-sm md:text-base">{user.user_metadata?.full_name || "Хэрэглэгч"}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* Desktop sign out */}
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="hidden md:flex w-full items-center justify-center gap-2 mt-6 py-3 rounded-xl border border-border text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Гарах
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="px-4 md:px-0 md:col-span-2 space-y-4">
            {/* Loyalty points card */}
            <div className="rounded-2xl p-4 md:p-5 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-sm">
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Sparkles className="h-4 w-4" />
                Лоялти оноо
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-extrabold">{points.toLocaleString("mn-MN")}</span>
                <span className="text-xs opacity-80">оноо</span>
              </div>
              <div className="mt-3 h-1.5 bg-white/25 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] md:text-xs mt-2 opacity-90">
                {pointsToNext > 0
                  ? `Дараагийн ${formatPrice(nextTier)} хямдрал авахад ${pointsToNext.toLocaleString("mn-MN")} оноо хэрэгтэй`
                  : `Одоо ${formatPrice(points)}-ийн хямдралд ашиглаж болно`}
              </p>
              <p className="text-[10px] mt-1 opacity-70">
                Захиалга хүргэгдэх бүрт барааны дүнгийн 1%-тай тэнцэх оноо нэмэгдэнэ.
              </p>
            </div>

            <div className="md:bg-card md:rounded-2xl md:border md:border-border md:overflow-hidden">
              {menuItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 md:px-6 md:py-4 hover:bg-secondary/50 transition-colors ${
                      i !== menuItems.length - 1 ? "md:border-b md:border-border" : ""
                    } rounded-xl md:rounded-none`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground hidden md:block">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>

            {/* Mobile sign out */}
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="md:hidden w-full flex items-center justify-center gap-2 mt-8 py-3 rounded-xl border border-border text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Гарах
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
