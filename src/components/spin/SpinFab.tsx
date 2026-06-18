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
          // First-time guests still get 3 free spins server-side
          setCount(3);
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
      className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="Азаа үзэж хож"
    >
      <Gift className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
