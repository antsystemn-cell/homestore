import { useNavigate } from "react-router-dom";
import { ChevronLeft, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/store/BottomNav";
import Header from "@/components/store/Header";
import ReferralCard from "@/components/profile/ReferralCard";

const InvitePage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Уншиж байна...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground max-w-md mx-auto px-4 text-center">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-2">Нэвтрээгүй байна</p>
          <p className="text-xs text-muted-foreground mb-4">Найзаа урих холбоосоо авахын тулд нэвтэрнэ үү.</p>
          <button
            onClick={() => navigate("/auth")}
            className="bg-primary text-primary-foreground rounded-xl px-8 py-3 text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Нэвтрэх / Бүртгүүлэх
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border md:hidden">
        <div className="flex items-center gap-2 px-3 py-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center"
            aria-label="Буцах"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold">Найзаа урих</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 md:py-12 md:px-8 space-y-4">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold mb-2">Найзаа урих</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Найз танаа уриад хоёулаа ёндоогийн нэмэлт эрх аваарай.
          </p>
        </div>
        <ReferralCard userId={user.id} />
      </div>
      <BottomNav />
    </div>
  );
};

export default InvitePage;
