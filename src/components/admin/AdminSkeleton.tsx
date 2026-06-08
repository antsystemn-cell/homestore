import { Skeleton } from "@/components/ui/skeleton";

type Tab = "stats" | "tracking" | "products" | "orders" | "users" | "drivers" | "categories" | "brands" | "delivery" | "delivery-portal" | "payments" | "banner" | "collections" | "chatbot" | "analytics" | "diagnostics" | "stocklog" | "recommendations" | "settings";

const AdminSkeleton = ({ tab }: { tab: Tab }) => {
  const renderStatsSkeleton = () => (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl p-4 md:p-6 border border-border">
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-xl mb-3 md:mb-4" />
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-6 w-24 md:h-8 md:w-32" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );

  const renderTableSkeleton = (rows = 6, cols = 4) => (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="grid gap-3 p-4 border-b border-border" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid gap-3 p-4 border-b border-border last:border-b-0" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderListSkeleton = (items = 6) => (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-48" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderGenericSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );

  switch (tab) {
    case "stats":
      return renderStatsSkeleton();
    case "products":
    case "orders":
    case "users":
      return renderTableSkeleton();
    case "categories":
    case "brands":
    case "delivery":
    case "payments":
      return renderListSkeleton();
    default:
      return renderGenericSkeleton();
  }
};

export default AdminSkeleton;
