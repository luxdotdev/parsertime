/* oxlint-disable react/no-array-index-key */
import { Skeleton } from "@/components/ui/skeleton";

/** Streaming fallbacks for the team stats overview, shared by the route-level
 * loading boundary and the per-section Suspense boundaries. */
export function SkeletonRibbon() {
  return (
    <div className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2 px-4 py-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSection({ bodyHeight }: { bodyHeight: number }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-44" />
        <Skeleton className="h-6 w-56" />
      </div>
      <Skeleton className="w-full" style={{ height: bodyHeight }} />
    </section>
  );
}

export function SkeletonTable({ rows }: { rows: number }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-44" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="border-border overflow-hidden rounded-md border">
        <Skeleton className="h-9 w-full rounded-none" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-3"
          >
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-4 w-32" />
            <div className="ml-auto flex items-center gap-6">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-1.5 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
