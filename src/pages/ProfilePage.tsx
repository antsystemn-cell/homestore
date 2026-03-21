import { User, Heart, Package, Settings, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import BottomNav from "@/components/store/BottomNav";

const menuItems = [
  { icon: Package, label: "Миний захиалга", path: "/" },
  { icon: Heart, label: "Хадгалсан бараа", path: "/" },
  { icon: Settings, label: "Тохиргоо", path: "/" },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { wishlist } = useCart();

  return (
    <div className="min-h-screen bg-secondary pb-16">
      <div className="bg-primary px-4 pt-10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Хэрэглэгч</h1>
            <p className="text-primary-foreground/70 text-sm">Нэвтрэх / Бүртгүүлэх</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full bg-card rounded-xl p-4 flex items-center gap-3 border border-border"
          >
            <item.icon className="h-5 w-5 text-primary" />
            <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
            {item.label === "Хадгалсан бараа" && wishlist.length > 0 && (
              <span className="text-xs text-muted-foreground">{wishlist.length}</span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
