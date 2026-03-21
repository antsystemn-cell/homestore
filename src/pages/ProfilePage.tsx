import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, LogOut, Shield, User, MapPin, Phone } from "lucide-react";
import BottomNav from "@/components/store/BottomNav";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Уншиж байна...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <header className="sticky top-0 z-50 bg-background px-4 py-4 border-b border-border">
          <h1 className="text-lg font-bold">Профайл</h1>
        </header>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <User className="h-16 w-16 mb-4 text-border" />
          <p className="text-sm font-medium mb-4">Нэвтрээгүй байна</p>
          <button
            onClick={() => navigate("/auth")}
            className="bg-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-bold"
          >
            Нэвтрэх / Бүртгүүлэх
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const menuItems = [
    { label: "Захиалгууд", icon: MapPin, onClick: () => {} },
    { label: "Хаяг", icon: MapPin, onClick: () => {} },
    { label: "Утасны дугаар", icon: Phone, onClick: () => {} },
    ...(isAdmin ? [{ label: "Админ удирдлага", icon: Shield, onClick: () => navigate("/admin") }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-50 bg-background px-4 py-4 border-b border-border">
        <h1 className="text-lg font-bold">Профайл</h1>
      </header>

      <div className="px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-xl font-bold">
            {(user.user_metadata?.full_name || user.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-sm">{user.user_metadata?.full_name || "Хэрэглэгч"}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        <button
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="w-full flex items-center justify-center gap-2 mt-8 py-3 rounded-xl border border-border text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Гарах
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
