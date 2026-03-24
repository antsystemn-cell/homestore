import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/context/AuthContext";
import LoadError from "@/components/store/LoadError";
import { Mail, Lock, User, ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const withTimeout = async <T,>(promise: PromiseLike<T>, ms = 8000): Promise<T | null> => {
  return await Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { authError } = useAuth();

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) {
      return error.message.includes("timeout")
        ? "Backend-тэй холбогдож чадсангүй. Дараа дахин оролдоно уу."
        : error.message;
    }

    return "Backend-тэй холбогдож чадсангүй. Дараа дахин оролдоно уу.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authError) {
      toast.error("Одоогоор нэвтрэх систем ажиллахгүй байна");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
        if (!result) throw new Error("Request timeout");
        if (result.error) throw result.error;
        toast.success("Амжилттай нэвтэрлээ");
        navigate("/");
      } else {
        const result = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
          })
        );
        if (!result) throw new Error("Request timeout");
        if (result.error) throw result.error;
        toast.success("Бүртгэл амжилттай! Имэйлээ шалгана уу.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    if (authError) {
      toast.error("Одоогоор нэвтрэх систем ажиллахгүй байна");
      return;
    }

    setLoading(true);
    try {
      const result = await withTimeout(lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin }));
      if (!result) throw new Error("Request timeout");
      if (result && "error" in result && result.error) throw result.error;
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-4 py-3 flex items-center gap-3 border-b border-border md:hidden">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Нэвтрэх</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md px-4">
            <LoadError
              message="Нэвтрэх серверт холбогдож чадсангүй"
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  const formContent = (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Нэр" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl bg-secondary pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" required />
          </div>
        )}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="email" placeholder="Имэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-secondary pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" required />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="password" placeholder="Нууц үг" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-secondary pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" required minLength={6} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors">
          {loading ? "Уншиж байна..." : isLogin ? "Нэвтрэх" : "Бүртгүүлэх"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">эсвэл</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-3">
        <button onClick={() => handleSocialLogin("google")} disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium hover:bg-secondary transition-colors">
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google-ээр нэвтрэх
        </button>
        <button onClick={() => handleSocialLogin("apple")} disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium hover:bg-secondary transition-colors">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Apple-ээр нэвтрэх
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        {isLogin ? "Бүртгэл байхгүй юу? " : "Бүртгэлтэй юу? "}
        <button onClick={() => setIsLogin(!isLogin)} className="text-foreground font-semibold underline underline-offset-4">
          {isLogin ? "Бүртгүүлэх" : "Нэвтрэх"}
        </button>
      </p>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="px-4 py-3 flex items-center gap-3 md:hidden">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">{isLogin ? "Нэвтрэх" : "Бүртгүүлэх"}</h1>
      </header>

      {/* Desktop Left Panel */}
      <div className="hidden md:flex md:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="h-20 w-20 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-8">
            <ShoppingBag className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-extrabold text-primary-foreground mb-4">
            Home<span className="opacity-60">Store</span>
          </h2>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Гэр ахуйн бараа, цахилгаан хэрэгсэл, гал тогооны хэрэгслүүдийг хямд үнээр худалдаж аваарай.
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-start md:items-center justify-center px-6 py-8 md:py-0">
        <div className="w-full max-w-sm">
          {/* Desktop back */}
          <button onClick={() => navigate(-1)} className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Буцах
          </button>

          <div className="text-center md:text-left mb-8">
            <h2 className="text-2xl font-extrabold md:hidden">
              Home<span className="text-primary/60">Store</span>
            </h2>
            <h2 className="hidden md:block text-2xl font-extrabold">
              {isLogin ? "Нэвтрэх" : "Бүртгүүлэх"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {isLogin ? "Бүртгэлтэй хаягаараа нэвтрэнэ үү" : "Шинэ бүртгэл үүсгэх"}
            </p>
          </div>

          {formContent}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
