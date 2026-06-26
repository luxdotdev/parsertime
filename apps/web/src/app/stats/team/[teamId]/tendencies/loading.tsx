import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mt-8 space-y-12">
      <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
        {["a", "b", "c", "d"].map((k) => (
          <div key={k} className="flex flex-col gap-1 px-4 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-0.5 h-7 w-20" />
            <Skeleton className="mt-0.5 h-3 w-12" />
          </div>
        ))}
      </dl>

      <section className="space-y-6">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-80" />
        </div>

        <div className="divide-y divide-[var(--border)]">
          {["a", "b", "c"].map((k) => (
            <article key={k} className="space-y-3 py-8 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <Skeleton className="h-5 w-36" />
                <div className="flex items-baseline gap-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {["a", "b", "c"].map((j) => (
                  <Skeleton key={j} className="h-6 w-28 rounded-sm" />
                ))}
              </div>

              <Skeleton className="h-72 w-full rounded-md" />

              <div className="border-border max-w-xl overflow-hidden rounded-md border">
                <div className="bg-muted/30 px-4 py-2">
                  <Skeleton className="h-2.5 w-40" />
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {["a", "b", "c", "d", "e"].map((j) => (
                    <div
                      key={j}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
