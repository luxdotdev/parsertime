import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 px-6 pt-6 pb-12 md:px-8">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 max-w-sm flex-1" />
        <Skeleton className="h-3.5 w-20" />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="divide-border divide-y">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <div key={k} className="flex items-start gap-4 px-4 py-3.5">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-full max-w-xs" />
              </div>
              <Skeleton className="mt-0.5 h-3 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-3.5 w-24" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
