import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </header>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {["csr", "tsr"].map((k) => (
          <div
            key={k}
            className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          >
            <div>
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="mt-3 h-7 w-48" />
              <Skeleton className="mt-3 h-3 w-28" />
              <Skeleton className="mt-6 h-9 w-36" />
            </div>

            <div className="space-y-6">
              <div className="border-border flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b pb-4">
                {["a", "b", "c"].map((j) => (
                  <div key={j} className="flex flex-col gap-1">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>

              <div>
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1.5 h-4 w-3/4" />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Skeleton className="h-2.5 w-24" />
                  <div className="mt-2 space-y-1.5">
                    {["a", "b", "c"].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
                <div>
                  <Skeleton className="h-2.5 w-24" />
                  <div className="mt-2 space-y-1.5">
                    {["a", "b"].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
