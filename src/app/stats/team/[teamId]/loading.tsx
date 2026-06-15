/* oxlint-disable react/no-array-index-key */
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamStatsLoading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div className="flex items-end gap-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-9 w-64" />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="flex items-baseline gap-x-8">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-6 w-10" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </header>

      <nav className="border-border mt-6 flex h-auto w-full flex-wrap justify-start gap-6 border-b pb-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </nav>

      <div className="mt-8 space-y-12">
        <SkeletonRibbon />
        <SkeletonSection bodyHeight={260} />
        <SkeletonTable rows={6} />
      </div>
    </div>
  );
}

function SkeletonRibbon() {
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

function SkeletonSection({ bodyHeight }: { bodyHeight: number }) {
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

function SkeletonTable({ rows }: { rows: number }) {
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
