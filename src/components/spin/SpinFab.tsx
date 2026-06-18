import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export default function SpinFab() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("spin_balances")
        .select("available_spins")
        .eq("user_id", user.id)
        .gt("available_spins", 0)
        .gt("expires_at", new Date().toISOString());
      if (!active) return;
      setCount((data || []).reduce((s, r) => s + (r.available_spins as number), 0));
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { active = false; clearInterval(t); };
  }, [user]);

  if (!user) return null;

  return (
    <Link
      to="/spin"
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="Эргүүлж хож"
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
