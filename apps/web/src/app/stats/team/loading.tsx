import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-44" />
        <Skeleton className="mt-3 h-4 w-80" />
      </header>

      <div className="mt-2 divide-y divide-[var(--border)]">
        <section className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="mt-3 h-6 w-48" />
            <Skeleton className="mt-3 h-3 w-32" />
            <Skeleton className="mt-6 h-9 w-full max-w-md" />
          </div>

          <div className="space-y-6">
            <dl className="border-border flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b pb-4">
              {["a", "b", "c"].map((k) => (
                <div key={k} className="flex flex-col gap-1.5">
                  <Skeleton className="h-2 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </dl>

            <div className="space-y-2">
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {["a", "b"].map((k) => (
                <div key={k} className="space-y-2">
                  <Skeleton className="h-2.5 w-24" />
                  {["a", "b", "c"].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="mt-3 h-6 w-48" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>

          <dl className="divide-y divide-[var(--border)]">
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div
                key={k}
                className="grid gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)]"
              >
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
