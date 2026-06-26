import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mt-8 space-y-12">
      <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y lg:grid-cols-4 lg:divide-y-0">
        {["a", "b", "c", "d"].map((k) => (
          <div key={k} className="flex flex-col gap-1 px-4 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </dl>

      <div className="space-y-4">
        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-6 w-48" />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {["a", "b", "c", "d"].map((k) => (
                <div key={k} className="space-y-1">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-9 w-16" />
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-8 md:grid-cols-2">
            <section className="space-y-4">
              <div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-6 w-48" />
              </div>
              <div className="space-y-4">
                {["a", "b", "c"].map((k) => (
                  <div key={k} className="border-border rounded-lg border p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Skeleton className="size-4 rounded" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                    <div className="space-y-2">
                      {["a", "b", "c", "d", "e"].map((j) => (
                        <div
                          key={j}
                          className="flex items-center gap-3 rounded-lg p-2"
                        >
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-10 w-10 rounded" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-5 w-16 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-6 w-48" />
              </div>
              <div className="space-y-2">
                {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
                  <Skeleton key={k} className="h-10 w-full" />
                ))}
              </div>
            </section>
          </div>

          <section className="space-y-4 border-t pt-6">
            <Skeleton className="h-2.5 w-28" />
            <div className="grid grid-cols-3 gap-4">
              {["a", "b", "c"].map((k) => (
                <div key={k} className="space-y-1">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-72" />
          </div>
          <div className="overflow-x-auto">
            <Skeleton className="h-48 w-full min-w-[640px]" />
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-80" />
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <Skeleton className="h-10 w-full" />
          <div className="divide-y divide-[var(--border)]">
            {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
              <Skeleton key={k} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-80" />
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <Skeleton className="h-10 w-full" />
          <div className="divide-y divide-[var(--border)]">
            {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
              <Skeleton key={k} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
