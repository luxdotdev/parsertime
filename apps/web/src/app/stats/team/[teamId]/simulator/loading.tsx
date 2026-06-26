import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
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

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-80" />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-64" />
              <div className="border-border flex flex-wrap gap-2 rounded-md border p-2">
                {["a", "b", "c", "d"].map((k) => (
                  <Skeleton key={k} className="h-11 w-11 rounded-md" />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-60" />
              <div className="border-border flex flex-wrap gap-2 rounded-md border p-2">
                {["a", "b", "c", "d"].map((k) => (
                  <Skeleton key={k} className="h-11 w-11 rounded-md" />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-64" />
              <div className="border-border flex flex-wrap gap-2 rounded-md border p-2">
                {["a", "b", "c", "d", "e"].map((k) => (
                  <Skeleton key={k} className="h-11 w-11 rounded-md" />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-64" />
              <div className="border-border flex flex-wrap gap-2 rounded-md border p-2">
                {["a", "b", "c", "d", "e"].map((k) => (
                  <Skeleton key={k} className="h-11 w-11 rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-72" />
          </div>

          <div className="flex items-baseline gap-3">
            <Skeleton className="h-12 w-24" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-16 rounded-sm" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-2.5 w-28" />
            <div className="space-y-1.5">
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <div
                  key={k}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5"
                >
                  <Skeleton className="h-4 w-28 shrink-0" />
                  <Skeleton className="h-1.5 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
