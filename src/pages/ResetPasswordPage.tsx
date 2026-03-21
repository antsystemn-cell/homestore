import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Нууц үг амжилттай солигдлоо");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-2 rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Нууц үг сэргээх</h1>
      </header>
      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Шинэ нууц үг"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold disabled:opacity-50"
          >
            {loading ? "Уншиж байна..." : "Нууц үг солих"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
