import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  count?: number;
}

const ProductGridSkeleton = ({ count = 8 }: Props) => (
  <div className="max-w-6xl mx-auto md:px-8 md:py-6">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-2 md:p-0">
          <div className="bg-card rounded-xl md:rounded-2xl border border-border overflow-hidden">
            <Skeleton className="w-full aspect-square" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ProductGridSkeleton;