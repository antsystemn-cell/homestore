import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isDriver: boolean;
  authError: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const withTimeout = async <T,>(promise: PromiseLike<T>, ms = 10000): Promise<T | null> => {
  return await Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
};

const clearStoredSession = () => {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // no-op
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [authError, setAuthError] = useState(false);

  const checkRoles = async (userId: string) => {
    try {
      const result = await withTimeout(
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
      );

      if (!result) {
        console.error("Failed to check roles: request timed out");
        setAuthError(true);
        setIsAdmin(false);
        setIsModerator(false);
        setIsDriver(false);
        return;
      }

      if (result.error) {
        console.error("Failed to check roles", result.error);
        setAuthError(true);
        setIsAdmin(false);
        setIsModerator(false);
        setIsDriver(false);
        return;
      }

      setAuthError(false);
      const roles = (result.data || []).map((r: any) => r.role);
      setIsAdmin(roles.includes("admin"));
      setIsModerator(roles.includes("moderator"));
      setIsDriver(roles.includes("driver"));
    } catch (error) {
      console.error("Failed to check roles", error);
      setAuthError(true);
      setIsAdmin(false);
      setIsModerator(false);
      setIsDriver(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await checkRoles(nextSession.user.id);
      } else {
        setIsAdmin(false);
        setIsModerator(false);
        setIsDriver(false);
      }

      if (mounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthError(false);
      void applySession(nextSession);
    });

    const loadSession = async () => {
      try {
        const result = await withTimeout(supabase.auth.getSession());

        if (!result || result.error) {
          if (result?.error) console.error("Failed to restore session", result.error);
          clearStoredSession();
          setAuthError(true);
          await applySession(null);
          return;
        }

        await applySession(result.data.session);
      } catch (error) {
        console.error("Failed to restore session", error);
        clearStoredSession();
        setAuthError(true);
        await applySession(null);
      }
    };

    void loadSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 3000);
    } catch (error) {
      console.error("Failed to sign out cleanly", error);
    } finally {
      clearStoredSession();
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setIsModerator(false);
      setIsDriver(false);
      setAuthError(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isModerator, isDriver, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
