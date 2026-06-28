import { Skeleton } from "@/components/ui/skeleton";

export function WinratesSkeleton() {
  return (
    <div className="mt-8 space-y-12">
      <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
        {["a", "b", "c", "d"].map((k) => (
          <div key={k} className="flex flex-col gap-1 px-4 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </dl>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-80" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-56" />
            <div className="border-border flex flex-wrap gap-2 rounded-md border p-2">
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-11 w-11 rounded-md" />
              ))}
            </div>
          </div>
          <div className="hidden items-center self-stretch sm:flex">
            <Skeleton className="h-3 w-6" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-56" />
            <div className="border-border flex flex-wrap gap-2 rounded-md border p-2">
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-11 w-11 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-80" />
          </div>
        </div>
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <div className="flex items-baseline gap-3">
              <Skeleton className="h-14 w-28" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-16 rounded-sm" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-[300px] w-full rounded-md" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-80" />
          </div>
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <div className="bg-muted/30 h-9 w-full" />
          {["a", "b", "c", "d", "e"].map((k) => (
            <div
              key={k}
              className="border-border flex items-center gap-4 border-t px-4 py-3"
            >
              <Skeleton className="h-4 w-6" />
              <div className="flex gap-1">
                {["a", "b", "c", "d", "e"].map((j) => (
                  <Skeleton key={j} className="h-7 w-7 rounded" />
                ))}
              </div>
              <Skeleton className="ml-auto h-4 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-80" />
          </div>
        </div>
        <div className="border-border h-[420px] overflow-hidden rounded-md border">
          <div className="bg-muted/30 h-9 w-full" />
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton
              key={k}
              className="border-border h-[52px] w-full rounded-none border-t"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
