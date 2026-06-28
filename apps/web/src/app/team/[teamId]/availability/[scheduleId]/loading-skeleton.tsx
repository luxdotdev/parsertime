import { Skeleton } from "@/components/ui/skeleton";

export function AvailabilityFillSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </header>

      <div className="grid items-end gap-3 sm:grid-cols-3">
        {["a", "b", "c"].map((k) => (
          <div key={k} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-[26rem] w-full rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
          </div>
          <Skeleton className="h-3 w-48" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-[26rem] w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton key={k} className="h-4 w-full" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
