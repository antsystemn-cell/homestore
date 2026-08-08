import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";

const UserDetailsPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Уншиж байна...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const userData = [
    { label: "Бүтэн нэр", value: user.user_metadata?.full_name || "Тодорхойгүй", icon: User },
    { label: "Имэйл хаяг", value: user.email, icon: Mail },
    { label: "Утасны дугаар", value: user.user_metadata?.phone || "Холбоогүй", icon: Phone },
    { label: "Бүртгүүлсэн огноо", value: new Date(user.created_at).toLocaleDateString("mn-MN"), icon: Calendar },
    { label: "Статус", value: "Идэвхтэй", icon: ShieldCheck, color: "text-green-500" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-border md:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Хэрэглэгчийн мэдээлэл</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Desktop Title */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Миний мэдээлэл</h1>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-3xl text-center shadow-sm">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-background shadow-inner">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold">{user.user_metadata?.full_name || "Хэрэглэгч"}</h2>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>

          {/* Details List */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            {userData.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx} 
                  className={`flex items-center gap-4 p-5 ${
                    idx !== userData.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icon className={`h-5 w-5 ${item.color || "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Info Note */}
          <div className="p-4 bg-secondary/30 rounded-2xl border border-dashed border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Мэдээллээ шинэчлэх эсвэл нууц үгээ солих бол Тохиргоо цэс рүү орно уу.
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default UserDetailsPage;
