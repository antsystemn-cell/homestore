import { useNavigate } from "react-router-dom";
import { Construction } from "lucide-react";

const MaintenancePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <Construction className="h-16 w-16 text-muted-foreground mb-6" />
      <h1 className="text-2xl font-bold mb-2">Засвар хийгдэж байна</h1>
      <p className="text-muted-foreground text-sm max-w-md mb-8">
        Сайт түр хугацаанд засварт орсон байна. Удахгүй эргэн ажиллах болно. Тэвчээр гарган хүлээнэ үү.
      </p>
      <button
        onClick={() => navigate("/admin")}
        className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Админ нэвтрэх
      </button>
    </div>
  );
};

export default MaintenancePage;
