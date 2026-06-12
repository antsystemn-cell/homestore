import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Store, UserPlus, X } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

interface EntryUser {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  branch_id: string | null;
  branch_name: string | null;
}

const BranchesManager = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  const [entryUsers, setEntryUsers] = useState<EntryUser[]>([]);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantBranch, setGrantBranch] = useState("");
  const [granting, setGranting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: bData } = await supabase.from("branches" as any).select("*").order("name");
    setBranches((bData as any) || []);

    // entry users via custom query
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "delivery_entry" as any);
    const userIds = (roleRows || []).map((r: any) => r.user_id);
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, branch_id")
        .in("user_id", userIds);
      const { data: admins } = await supabase.rpc("admin_list_users" as any);
      const emailMap = new Map<string, string>(
        ((admins as any) || []).map((u: any) => [u.user_id, u.email])
      );
      const branchMap = new Map<string, string>(((bData as any) || []).map((b: any) => [b.id, b.name]));
      setEntryUsers(
        (profs || []).map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          phone: p.phone,
          email: emailMap.get(p.user_id) || null,
          branch_id: p.branch_id,
          branch_name: p.branch_id ? branchMap.get(p.branch_id) || null : null,
        }))
      );
    } else {
      setEntryUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addBranch = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("branches" as any).insert({
      name: newName.trim(),
      code: newCode.trim() || null,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewName(""); setNewCode("");
    toast.success("Салбар нэмэгдлээ");
    load();
  };

  const toggleActive = async (b: Branch) => {
    const { error } = await supabase.from("branches" as any).update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  const deleteBranch = async (b: Branch) => {
    if (!confirm(`"${b.name}" салбарыг устгах уу?`)) return;
    const { error } = await supabase.from("branches" as any).delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Устгалаа");
    load();
  };

  const setUserBranch = async (userId: string, branchId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ branch_id: branchId || null } as any)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Шинэчиллээ");
    load();
  };

  const revokeUser = async (userId: string) => {
    if (!confirm("Энэ хэрэглэгчийн хүргэлт шивэх эрхийг хасах уу?")) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "delivery_entry" as any);
    if (error) return toast.error(error.message);
    toast.success("Эрх хаслаа");
    load();
  };

  const grantUser = async () => {
    if (!grantEmail.trim() || !grantBranch) return;
    setGranting(true);
    try {
      const { data: admins } = await supabase.rpc("admin_list_users" as any);
      const found = ((admins as any) || []).find(
        (u: any) => (u.email || "").toLowerCase() === grantEmail.trim().toLowerCase()
      );
      if (!found) { toast.error("Хэрэглэгч олдсонгүй"); return; }

      const { error: rErr } = await supabase.from("user_roles").insert({
        user_id: found.user_id,
        role: "delivery_entry" as any,
      });
      if (rErr && !rErr.message.includes("duplicate")) { toast.error(rErr.message); return; }

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ branch_id: grantBranch } as any)
        .eq("user_id", found.user_id);
      if (pErr) { toast.error(pErr.message); return; }

      toast.success("Эрх олголоо");
      setGrantOpen(false); setGrantEmail(""); setGrantBranch("");
      load();
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Branches */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Store className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Салбарууд</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input placeholder="Салбарын нэр" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="Код (заавал биш)" value={newCode} onChange={(e) => setNewCode(e.target.value)} className="sm:max-w-[180px]" />
          <Button onClick={addBranch} disabled={creating || !newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Нэмэх
          </Button>
        </div>

        <div className="divide-y divide-border">
          {branches.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">Салбар алга</div>
          )}
          {branches.map((b) => (
            <div key={b.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{b.name}</div>
                {b.code && <div className="text-xs text-muted-foreground">{b.code}</div>}
              </div>
              <button
                onClick={() => toggleActive(b)}
                className={`text-xs px-2 py-1 rounded-full ${b.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}
              >
                {b.is_active ? "Идэвхтэй" : "Идэвхгүй"}
              </button>
              <Button variant="ghost" size="icon" onClick={() => deleteBranch(b)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery entry users */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Хүргэлт шивэгчид</h3>
          </div>
          <Button size="sm" onClick={() => setGrantOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Эрх олгох
          </Button>
        </div>

        {grantOpen && (
          <div className="mb-4 p-3 rounded-xl border border-border bg-secondary/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Шинэ эрх олгох</div>
              <button onClick={() => setGrantOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <Input placeholder="Хэрэглэгчийн имэйл" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} />
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={grantBranch}
              onChange={(e) => setGrantBranch(e.target.value)}
            >
              <option value="">Салбар сонгох...</option>
              {branches.filter(b => b.is_active).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <Button onClick={grantUser} disabled={granting || !grantEmail.trim() || !grantBranch} className="w-full">
              {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Эрх олгох"}
            </Button>
          </div>
        )}

        <div className="divide-y divide-border">
          {entryUsers.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">Хүргэлт шивэгч алга</div>
          )}
          {entryUsers.map((u) => (
            <div key={u.user_id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{u.full_name || u.email || u.user_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{u.email} {u.phone ? `· ${u.phone}` : ""}</div>
              </div>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={u.branch_id || ""}
                onChange={(e) => setUserBranch(u.user_id, e.target.value)}
              >
                <option value="">— Салбаргүй —</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" onClick={() => revokeUser(u.user_id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BranchesManager;
