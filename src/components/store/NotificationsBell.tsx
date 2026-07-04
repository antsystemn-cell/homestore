import { useState } from "react";
import { Bell, Check, ShoppingCart, Clock, X, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function iconFor(kind: string) {
  if (kind === "cart_abandoned") return ShoppingCart;
  if (kind === "reorder") return Clock;
  return Bell;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "саяхан";
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} цаг`;
  const day = Math.floor(h / 24);
  return `${day} өдөр`;
}

interface Props {
  className?: string;
  compact?: boolean;
}

const NotificationsBell = ({ className, compact }: Props) => {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markRead, markAllRead, remove } = useNotifications();
  const navigate = useNavigate();

  const handleClick = async (n: AppNotification) => {
    if (!n.read_at) await markRead(n.id);
    setOpen(false);
    if (n.link_url) navigate(n.link_url);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Мэдэгдэл"
          className={cn(
            "relative rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors",
            compact ? "p-1.5" : "p-2",
            className,
          )}
        >
          <Bell className={compact ? "h-4 w-4" : "h-5 w-5"} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-sale text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="font-semibold text-sm">Мэдэгдэл</div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Бүгдийг уншсан
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-40" />
              <div className="text-xs">Мэдэгдэл байхгүй байна</div>
            </div>
          ) : (
            items.map((n) => {
              const Icon = iconFor(n.kind);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group flex gap-2 px-3 py-2.5 border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                    !n.read_at && "bg-primary/5",
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div className={cn(
                    "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                    !n.read_at ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold text-foreground truncate">{n.title}</div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-full hover:bg-muted flex-shrink-0 flex items-center justify-center transition-opacity"
                    aria-label="Устгах"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsBell;
