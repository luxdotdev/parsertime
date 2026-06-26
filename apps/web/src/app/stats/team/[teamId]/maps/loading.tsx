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
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[300px] w-full rounded-md" />
          <div className="border-border divide-y divide-[var(--border)] border-y md:grid md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-3">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <div className="space-y-1.5">
                  {["x", "y", "z"].map((j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-3.5 w-16" />
                      <Skeleton className="h-3.5 w-14" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
          </div>
        </div>
        <div className="border-border grid gap-4 border-y py-4 sm:grid-cols-2 lg:grid-cols-3">
          {["a", "b", "c"].map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <Skeleton key={k} className="h-48 w-full rounded-md" />
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
        <div className="overflow-x-auto">
          <div className="space-y-1">
            <div className="flex gap-1">
              <Skeleton className="h-8 w-[140px] shrink-0" />
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-8 w-[100px] shrink-0" />
              ))}
            </div>
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div key={k} className="flex gap-1">
                <Skeleton className="h-16 w-[140px] shrink-0" />
                {["a", "b", "c", "d", "e"].map((j) => (
                  <Skeleton key={j} className="h-16 w-[100px] shrink-0" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </section>
    </div>
  );
}
