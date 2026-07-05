import { Skeleton } from "@/components/ui/skeleton";

export function SwapsSkeleton() {
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
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="border-border grid gap-x-6 gap-y-6 divide-y divide-[var(--border)] border-y py-4 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="space-y-2 md:px-4">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-[280px] w-full" />
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          {["a", "b"].map((k) => (
            <div key={k} className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-[200px] w-full" />
              <div className="border-border grid grid-cols-3 divide-x divide-y divide-[var(--border)] border-y lg:divide-y-0">
                {["x", "y", "z"].map((j) => (
                  <div key={j} className="flex flex-col gap-1 px-3 py-2">
                    <Skeleton className="h-2 w-12" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-[264px] w-full" />
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
