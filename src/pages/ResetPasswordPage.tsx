import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Нууц үг таарахгүй байна");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else { toast.success("Нууц үг амжилттай солигдлоо"); navigate("/"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Left Panel */}
      <div className="hidden md:flex md:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="h-20 w-20 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-8">
            <KeyRound className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-extrabold text-primary-foreground mb-4">
            Нууц үг сэргээх
          </h2>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Шинэ нууц үгээ оруулж аккаунтаа сэргээнэ үү.
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => navigate("/")} className="p-2 rounded-full bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Нууц үг сэргээх</h1>
        </header>

        <div className="flex-1 flex items-start md:items-center justify-center px-6 py-8 md:py-0">
          <div className="w-full max-w-sm">
            <button onClick={() => navigate("/")}
              className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Нүүр хуудас
            </button>

            <div className="mb-8 md:text-left">
              <h2 className="hidden md:block text-2xl font-extrabold">Шинэ нууц үг</h2>
              <p className="text-sm text-muted-foreground mt-2">Шинэ нууц үгээ оруулна уу</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password" placeholder="Шинэ нууц үг" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-secondary pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required minLength={6}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password" placeholder="Нууц үг давтах" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl bg-secondary pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required minLength={6}
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {loading ? "Уншиж байна..." : "Нууц үг солих"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
