import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-9 w-52" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-8 w-24 rounded-full" />
        ))}
        <Skeleton className="h-8 w-40" />
      </div>

      <section className="mt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="min-w-0">
            <Skeleton className="mb-3 h-8 w-full" />
            {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
              <Skeleton key={k} className="mt-px h-12 w-full" />
            ))}
          </div>

          <aside>
            <div className="space-y-8">
              <div className="border-border border-b pb-5">
                <Skeleton className="h-3 w-36" />
                <div className="mt-2 flex items-baseline justify-between gap-4">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="mt-1 h-3 w-24" />
              </div>

              <div className="space-y-3">
                <Skeleton className="h-3 w-20" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  {["a", "b", "c", "d"].map((k) => (
                    <div key={k}>
                      <Skeleton className="h-2.5 w-14" />
                      <Skeleton className="mt-1.5 h-6 w-16" />
                      <Skeleton className="mt-1 h-2.5 w-20" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-48 w-full rounded-md" />
              </div>

              <div className="space-y-4">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-64 w-full rounded-md" />
              </div>

              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <ul className="grid grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2">
                  {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
                    <li
                      key={k}
                      className="border-border/60 flex items-baseline justify-between gap-6 border-b py-1.5"
                    >
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
