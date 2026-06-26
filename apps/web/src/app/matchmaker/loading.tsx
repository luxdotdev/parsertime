import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border border-b pb-6">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-3 h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-80" />
      </header>

      <section className="grid gap-x-10 gap-y-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-3 h-7 w-48" />
          <Skeleton className="mt-3 h-4 w-64" />
        </div>

        <div className="space-y-6">
          {["a", "b", "c"].map((k) => (
            <div key={k}>
              <Skeleton className="h-2.5 w-20" />
              <div className="mt-2 space-y-1.5">
                {["p", "q", "r"].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border border-t pt-10 sm:pt-12">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-3 h-7 w-48" />
            <Skeleton className="mt-3 h-4 w-64" />
          </div>

          <div className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {["a", "b", "c"].map((k) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
