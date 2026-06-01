import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Plus, Loader2, Trash2, Pencil, Check, X, ChevronDown, ChevronUp, History, Search, UserCheck, UserX, Clock, Mail, Phone } from "lucide-react";

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  note: string | null;
  is_active: boolean;
};

type DeliveryRow = {
  id: string;
  order_ref: string | null;
  driver_id: string | null;
  delivery_signature_name: string | null;
  status: string | null;
  delivery_status: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  assigned_at: string | null;
  total: number | null;
  phone: string | null;
  shipping_address: string | null;
};

type Props = {
  drivers: Driver[];
  isAdmin: boolean;
  onChange: () => void | Promise<void>;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("mn-MN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

const DriversManager = ({ drivers, isAdmin, onChange }: Props) => {
  const [form, setForm] = useState({ full_name: "", phone: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", note: "" });
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "out_for_delivery" | "delivered">("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [driverSearch, setDriverSearch] = useState("");

  // ===== Driver role requests =====
  type DriverRequest = {
    id: string;
    user_id: string;
    full_name: string | null;
    phone: string | null;
    note: string | null;
    status: "pending" | "approved" | "rejected";
    email: string | null;
    created_at: string;
    reviewed_at: string | null;
    review_note: string | null;
  };
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestFilter, setRequestFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!isAdmin) return;
    setRequestsLoading(true);
    const { data, error } = await supabase.rpc("list_driver_requests");
    setRequestsLoading(false);
    if (error) {
      console.error("loadRequests", error);
      return;
    }
    setRequests((data || []) as DriverRequest[]);
  };

  useEffect(() => {
    void loadRequests();
  }, [isAdmin]);

  // Realtime updates for driver_role_requests
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-driver-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_role_requests" },
        () => void loadRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const approveRequest = async (req: DriverRequest) => {
    setActingRequestId(req.id);
    const { error } = await supabase
      .from("driver_role_requests" as any)
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        review_note: null,
      } as any)
      .eq("id", req.id);
    setActingRequestId(null);
    if (error) {
      toast.error("Батлахад алдаа: " + error.message);
      return;
    }
    toast.success(`${req.full_name || "Хэрэглэгч"}-д жолоочийн эрх олголоо`);

    // Auto-add to drivers table for assignment workflow if not already present
    if (req.full_name) {
      const exists = drivers.some(
        (d) =>
          d.full_name.trim().toLowerCase() === req.full_name!.trim().toLowerCase() &&
          (d.phone || "") === (req.phone || "")
      );
      if (!exists) {
        await supabase.from("drivers" as any).insert({
          full_name: req.full_name,
          phone: req.phone || null,
          note: req.note || null,
        } as any);
        await onChange();
      }
    }
    void loadRequests();
  };

  const rejectRequest = async (req: DriverRequest) => {
    const reason = window.prompt("Татгалзах шалтгаан (заавал биш):", "") ?? "";
    setActingRequestId(req.id);
    const { error } = await supabase
      .from("driver_role_requests" as any)
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        review_note: reason.trim() || null,
      } as any)
      .eq("id", req.id);
    setActingRequestId(null);
    if (error) {
      toast.error("Татгалзахад алдаа: " + error.message);
      return;
    }
    toast.success("Хүсэлтийг татгалзлаа");
    void loadRequests();
  };

  const visibleRequests = useMemo(
    () => (requestFilter === "all" ? requests : requests.filter((r) => r.status === requestFilter)),
    [requests, requestFilter]
  );
  const pendingCount = useMemo(() => requests.filter((r) => r.status === "pending").length, [requests]);


  const loadDeliveries = async () => {
    setLoadingDeliveries(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_ref, driver_id, delivery_signature_name, status, delivery_status, picked_up_at, delivered_at, assigned_at, total, phone, shipping_address")
      .or("driver_id.not.is.null,delivery_signature_name.not.is.null")
      .order("picked_up_at", { ascending: false, nullsFirst: false })
      .limit(500);
    setLoadingDeliveries(false);
    if (error) {
      console.error("loadDeliveries", error);
      return;
    }
    setDeliveries((data || []) as DeliveryRow[]);
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((r) => {
      if (statusFilter === "delivered") {
        if (!(r.status === "completed" || r.delivered_at)) return false;
      } else if (statusFilter === "out_for_delivery") {
        if (r.delivered_at || r.status === "completed") return false;
        if (!(r.status === "delivering" || r.delivery_status === "out_for_delivery")) return false;
      }
      return true;
    });
  }, [deliveries, statusFilter]);

  const statsByDriver = useMemo(() => {
    const map = new Map<string, DeliveryRow[]>();
    for (const row of filteredDeliveries) {
      const key = row.driver_id || `name:${(row.delivery_signature_name || "").trim().toLowerCase()}`;
      if (!key || key === "name:") continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map;
  }, [filteredDeliveries]);

  const unknownDrivers = useMemo(() => {
    const known = new Set(drivers.map((d) => d.id));
    const out: { key: string; name: string; rows: DeliveryRow[] }[] = [];
    statsByDriver.forEach((rows, key) => {
      if (key.startsWith("name:")) {
        out.push({ key, name: rows[0].delivery_signature_name || "—", rows });
      } else if (!known.has(key)) {
        out.push({ key, name: rows[0].delivery_signature_name || "Тодорхойгүй", rows });
      }
    });
    return out;
  }, [statsByDriver, drivers]);

  const addDriver = async () => {
    const name = form.full_name.trim();
    if (!name) {
      toast.error("Жолоочийн нэрийг оруулна уу");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("drivers" as any).insert({
      full_name: name,
      phone: form.phone.trim() || null,
      note: form.note.trim() || null,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа: " + error.message);
      return;
    }
    toast.success("Жолооч нэмэгдлээ");
    setForm({ full_name: "", phone: "", note: "" });
    await onChange();
  };

  const toggleActive = async (d: Driver) => {
    const { error } = await supabase
      .from("drivers" as any)
      .update({ is_active: !d.is_active, updated_at: new Date().toISOString() } as any)
      .eq("id", d.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await onChange();
  };

  const startEdit = (d: Driver) => {
    setEditingId(d.id);
    setEditForm({
      full_name: d.full_name,
      phone: d.phone || "",
      note: d.note || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editForm.full_name.trim();
    if (!name) {
      toast.error("Нэр заавал шаардлагатай");
      return;
    }
    const { error } = await supabase
      .from("drivers" as any)
      .update({
        full_name: name,
        phone: editForm.phone.trim() || null,
        note: editForm.note.trim() || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", editingId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Шинэчиллээ");
    setEditingId(null);
    await onChange();
  };

  const removeDriver = async (d: Driver) => {
    if (!confirm(`"${d.full_name}" жолоочийг устгах уу?`)) return;
    const { error } = await supabase.from("drivers" as any).delete().eq("id", d.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Устгалаа");
    await onChange();
  };

  const renderDriverStats = (key: string, label: string, rows: DeliveryRow[]) => {
    const total = rows.length;
    const delivered = rows.filter((r) => r.status === "completed" || r.delivered_at).length;
    const inProgress = rows.filter((r) => !r.delivered_at && (r.status === "delivering" || r.delivery_status === "out_for_delivery")).length;
    const lastAt = rows[0]?.picked_up_at || rows[0]?.assigned_at || rows[0]?.delivered_at;
    const expanded = expandedId === key;
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedId(expanded ? null : key)}
          className="w-full flex items-center justify-between gap-3 p-4 hover:bg-secondary/40 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Сүүлд: {formatDate(lastAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full">
              {total} хүргэлт
            </span>
            <span className="bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full">
              {delivered} ✓
            </span>
            {inProgress > 0 && (
              <span className="bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full">
                {inProgress} яваа
              </span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        {expanded && (
          <div className="border-t border-border divide-y divide-border max-h-96 overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="p-3 text-xs flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.order_ref || r.id.slice(0, 8)}</p>
                  <p className="text-muted-foreground truncate">
                    {r.phone || "—"} {r.shipping_address ? `· ${r.shipping_address}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-muted-foreground">Авсан: {formatDate(r.picked_up_at)}</p>
                  {r.delivered_at && (
                    <p className="text-emerald-600 font-semibold">Хүргэсэн: {formatDate(r.delivered_at)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Жолоочийн эрхийн хүсэлтүүд
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1.5 text-xs">
              {(["pending", "approved", "rejected", "all"] as const).map((s) => {
                const labels = { pending: "Хянагдаж буй", approved: "Батлагдсан", rejected: "Татгалзсан", all: "Бүгд" } as const;
                const isActive = requestFilter === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRequestFilter(s)}
                    className={`px-2.5 py-1 rounded-full border transition ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {requestsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : visibleRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Хүсэлт алга байна.</p>
          ) : (
            <div className="space-y-2">
              {visibleRequests.map((req) => {
                const isPending = req.status === "pending";
                const isApproved = req.status === "approved";
                const isRejected = req.status === "rejected";
                const acting = actingRequestId === req.id;
                return (
                  <div
                    key={req.id}
                    className="border border-border rounded-xl p-3 bg-background flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{req.full_name || "—"}</p>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium">
                            <Clock className="h-3 w-3" /> Хянагдаж буй
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                            <Check className="h-3 w-3" /> Батлагдсан
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-medium">
                            <X className="h-3 w-3" /> Татгалзсан
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {req.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {req.email}
                          </span>
                        )}
                        {req.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {req.phone}
                          </span>
                        )}
                        <span>Илгээсэн: {formatDate(req.created_at)}</span>
                        {req.reviewed_at && <span>Хянасан: {formatDate(req.reviewed_at)}</span>}
                      </div>
                      {req.note && (
                        <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2 mt-1">
                          {req.note}
                        </p>
                      )}
                      {isRejected && req.review_note && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-1">
                          Шалтгаан: {req.review_note}
                        </p>
                      )}
                    </div>
                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => approveRequest(req)}
                          disabled={acting}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                          Батлах
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectRequest(req)}
                          disabled={acting}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                        >
                          <UserX className="h-3 w-3" />
                          Татгалзах
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="bg-card rounded-2xl p-4 md:p-6 border border-border space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Truck className="h-4 w-4" /> Шинэ жолооч бүртгэх
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Нэр *"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="tel"
              placeholder="Утас"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="text"
              placeholder="Тэмдэглэл"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="rounded-xl bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={addDriver}
            disabled={saving || !form.full_name.trim()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Нэмэх
          </button>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm">Бүртгэлтэй жолоочид ({drivers.length})</h3>
        </div>
        {drivers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Жолооч бүртгэгдээгүй байна</p>
        ) : (
          <div className="divide-y divide-border">
            {drivers.map((d) => {
              const editing = editingId === d.id;
              return (
                <div key={d.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  {editing ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                        className="rounded-lg bg-secondary px-3 py-2 text-sm"
                        placeholder="Нэр"
                      />
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        className="rounded-lg bg-secondary px-3 py-2 text-sm"
                        placeholder="Утас"
                      />
                      <input
                        type="text"
                        value={editForm.note}
                        onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                        className="rounded-lg bg-secondary px-3 py-2 text-sm"
                        placeholder="Тэмдэглэл"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{d.full_name}</p>
                        {!d.is_active && (
                          <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Идэвхгүй</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.phone || "—"}
                        {d.note ? ` · ${d.note}` : ""}
                      </p>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {editing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                          >
                            <Check className="h-3.5 w-3.5" /> Хадгалах
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-xs font-bold px-3 py-1.5 rounded-lg"
                          >
                            <X className="h-3.5 w-3.5" /> Болих
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleActive(d)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80"
                          >
                            {d.is_active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                          </button>
                          <button
                            onClick={() => startEdit(d)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Засах
                          </button>
                          <button
                            onClick={() => removeDriver(d)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Устгах
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Хүргэлтийн түүх
          </h3>
          <button
            type="button"
            onClick={loadDeliveries}
            disabled={loadingDeliveries}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50"
          >
            {loadingDeliveries ? "Ачаалж байна..." : "Шинэчлэх"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Бүх төлөв</option>
            <option value="out_for_delivery">Хүргэлтэнд гарсан</option>
            <option value="delivered">Хүргэгдсэн</option>
          </select>
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Бүх жолооч</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
            {unknownDrivers.length > 0 && (
              <option value="__unknown__">Бүртгэлгүй жолоочид</option>
            )}
          </select>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Жолоочийн нэрээр хайх..."
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              className="w-full rounded-xl bg-secondary pl-8 pr-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {loadingDeliveries ? (
          <div className="bg-card rounded-2xl border border-border p-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {drivers
              .filter((d) => {
                if (driverFilter !== "all" && driverFilter !== d.id) return false;
                if (!driverSearch.trim()) return true;
                return d.full_name.toLowerCase().includes(driverSearch.trim().toLowerCase());
              })
              .map((d) => {
                const rows = statsByDriver.get(d.id) || [];
                if (rows.length === 0) return null;
                return <div key={d.id}>{renderDriverStats(d.id, d.full_name, rows)}</div>;
              })}
            {(driverFilter === "all" || driverFilter === "__unknown__") &&
              unknownDrivers
                .filter((u) => {
                  if (!driverSearch.trim()) return true;
                  return u.name.toLowerCase().includes(driverSearch.trim().toLowerCase());
                })
                .map((u) => (
                  <div key={u.key}>{renderDriverStats(u.key, `${u.name} (бүртгэлгүй)`, u.rows)}</div>
                ))}
            {statsByDriver.size === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8 bg-card rounded-2xl border border-border">
                Тохирох хүргэлт олдсонгүй
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriversManager;
