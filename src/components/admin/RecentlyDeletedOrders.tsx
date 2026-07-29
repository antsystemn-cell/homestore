import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, RotateCcw, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface DeletedOrder {
  id: string;
  order_id: string;
  order_ref: string | null;
  snapshot: any;
  deleted_by_email: string | null;
  deleted_at: string;
}

interface Props {
  refreshKey?: number;
  onRestored?: () => void;
}

const RecentlyDeletedOrders = ({ refreshKey = 0, onRestored }: Props) => {
  const [items, setItems] = useState<DeletedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_deleted_orders" as any, { _limit: 5 });
    if (error) {
      console.error(error);
    } else {
      setItems((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const restore = async (id: string) => {
    setRestoringId(id);
    const { error } = await supabase.rpc("admin_restore_deleted_order" as any, { _archive_id: id });
    setRestoringId(null);
    if (error) {
      toast.error("Сэргээхэд алдаа гарлаа: " + error.message);
      return;
    }
    toast.success("Захиалга сэргээгдлээ");
    await load();
    onRestored?.();
  };

  if (!loading && items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
          Сүүлд устгагдсан захиалгууд
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="divide-y divide-border">
          {loading && (
            <div className="p-4 flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Ачаалж байна...
            </div>
          )}
          {items.map((it) => {
            const snap = it.snapshot || {};
            const total = Number(snap.total || 0);
            const itemsArr = Array.isArray(snap.items) ? snap.items : [];
            return (
              <div key={it.id} className="p-3 sm:p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-semibold">
                    {it.order_ref || it.order_id.slice(0, 8)}
                    <span className="ml-2 text-[11px] font-normal px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {snap.status || "—"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {snap.guest_name || snap.phone || "—"} · {itemsArr.length} бараа · {total.toLocaleString("mn-MN")}₮
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Устгасан: {new Date(it.deleted_at).toLocaleString("mn-MN")}
                    {it.deleted_by_email ? ` · ${it.deleted_by_email}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restore(it.id)}
                  disabled={restoringId === it.id}
                >
                  {restoringId === it.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1" />
                  )}
                  Сэргээх
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentlyDeletedOrders;
