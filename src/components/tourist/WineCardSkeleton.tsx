import { Skeleton } from "@/components/ui/skeleton";

export default function WineCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/30 overflow-hidden">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function WineGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <WineCardSkeleton key={i} />
      ))}
    </div>
  );
}
