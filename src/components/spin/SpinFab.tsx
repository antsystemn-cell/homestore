import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";

export default function SpinFab() {
  const { user, loading } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (loading) return;
    let active = true;
    const load = async () => {
      if (user) {
        const { data } = await supabase
          .from("spin_balances")
          .select("available_spins")
          .eq("user_id", user.id)
          .gt("available_spins", 0)
          .gt("expires_at", new Date().toISOString());
        if (!active) return;
        setCount((data || []).reduce((s, r) => s + (r.available_spins as number), 0));
      } else {
        const fp = getDeviceFingerprint();
        const { data } = await supabase
          .from("guest_spin_balances")
          .select("available_spins, expires_at")
          .eq("fingerprint", fp)
          .maybeSingle();
        if (!active) return;
        if (data && new Date(data.expires_at).getTime() > Date.now()) {
          setCount(data.available_spins as number);
        } else {
          // First-time guests still get 2 free spins server-side
          setCount(2);
        }
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { active = false; clearInterval(t); };
  }, [user, loading]);

  return (
    <Link
      to="/spin"
      className="fixed bottom-20 right-2 md:bottom-10 md:right-10 z-40 flex flex-col items-center gap-1.5 group"
      aria-label="Ёндоогоо үз... хож"
    >
      <span className="relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300">
        <span className="absolute -inset-1 rounded-full bg-destructive/20 animate-pulse" />
        <span className="absolute -inset-0.5 rounded-full ring-2 ring-destructive ring-offset-2 animate-pulse" />
        <Gift className="h-6 w-6 relative z-10" />
      </span>
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-md">
        Ёндоогоо үзэх
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {count}
          </span>
        )}
      </span>
    </Link>
  );
}
