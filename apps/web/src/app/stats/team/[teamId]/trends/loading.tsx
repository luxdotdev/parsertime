import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mt-8 space-y-12">
      <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
        {["a", "b", "c", "d"].map((k) => (
          <div key={k} className="flex flex-col gap-2 px-4 py-3">
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
          </div>
          <Skeleton className="h-9 w-32 shrink-0" />
        </div>
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-[350px] w-full rounded-md" />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-6 w-40" />
              <Skeleton className="mt-1 h-4 w-60" />
            </div>
            <Skeleton className="h-9 w-32 shrink-0" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-12" />
          </div>
          <div className="border-border overflow-hidden rounded-md border">
            <div className="bg-muted/30 px-4 py-2">
              <div className="flex gap-6">
                {["a", "b", "c", "d"].map((k) => (
                  <Skeleton key={k} className="h-3 w-14" />
                ))}
              </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {["a", "b", "c", "d", "e"].map((k) => (
                <div key={k} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-6 w-full rounded-md" />
        </section>

        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-44" />
          </div>
          <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-3 sm:divide-y-0">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="flex flex-col gap-1 px-4 py-4">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
