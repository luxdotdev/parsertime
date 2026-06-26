import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <header className="border-border bg-card/40 rounded-xl border p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-9 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
        </div>
        <div className="mt-5">
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </header>

      <div className="border-border divide-border bg-card divide-y overflow-hidden rounded-xl border">
        {["a", "b", "c", "d", "e"].map((k) => (
          <div
            key={k}
            className="flex items-center justify-between gap-6 px-5 py-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-4 w-full max-w-xs" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
