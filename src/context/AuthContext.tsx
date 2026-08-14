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
  isSeller: boolean;
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
  const [isSeller, setIsSeller] = useState(false);
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
        setIsAdmin(false);
        setIsModerator(false);
        setIsDriver(false);
        setIsSeller(false);
        return;
      }

      if (result.error) {
        console.error("Failed to check roles", result.error);
        setIsAdmin(false);
        setIsModerator(false);
        setIsDriver(false);
        setIsSeller(false);
        return;
      }

      setAuthError(false);
      const roles = (result.data || []).map((r: any) => r.role);
      setIsAdmin(roles.includes("admin"));
      setIsModerator(roles.includes("moderator"));
      setIsDriver(roles.includes("driver"));
      setIsSeller(roles.includes("seller"));
    } catch (error) {
      console.error("Failed to check roles", error);
      setIsAdmin(false);
      setIsModerator(false);
      setIsDriver(false);
      setIsSeller(false);
    }
  };

  useEffect(() => {
    // Capture ?ref=CODE from URL and stash for post-signup redemption
    try {
      const p = new URLSearchParams(window.location.search);
      const ref = p.get("ref");
      if (ref && ref.length >= 4) {
        localStorage.setItem("pending_ref", ref.trim());
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.user) {
        // Role loading must not block or invalidate an otherwise valid login.
        void checkRoles(nextSession.user.id);
        // Redeem stashed referral code (silent no-op if invalid / already used)
        try {
          const pending = localStorage.getItem("pending_ref");
          if (pending) {
            const { data } = await supabase.rpc("apply_referral_code" as any, { _code: pending });
            const ok = (data as any)?.ok;
            const err = (data as any)?.error;
            if (ok || err === "already_referred" || err === "existing_customer" || err === "self_referral" || err === "code_not_found") {
              localStorage.removeItem("pending_ref");
            }
          }
        } catch { /* noop */ }
      } else {
        setIsAdmin(false);
        setIsModerator(false);
        setIsDriver(false);
        setIsSeller(false);
      }

    };


    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthError(false);
      void applySession(nextSession);
    });

    const loadSession = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const result = await withTimeout(supabase.auth.getSession());

          if (result && !result.error) {
            setAuthError(false);
            await applySession(result.data.session);
            return;
          }

          if (result?.error) console.error("Failed to restore session", result.error);
        } catch (error) {
          console.error("Failed to restore session", error);
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
        }
      }

      // A temporary backend/network error must never delete a valid saved login.
      // Keep the token so the SDK can recover automatically on the next refresh.
      if (!mounted) return;
      setAuthError(true);
      setLoading(false);
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
      setIsSeller(false);
      setAuthError(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isModerator, isDriver, isSeller, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
