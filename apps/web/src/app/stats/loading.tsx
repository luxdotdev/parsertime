import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <Skeleton className="h-7 w-32" />
      </div>

      <div className="mb-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-3 w-80" />
        </div>
      </div>

      <section className="mb-8">
        <header className="mb-5 flex flex-col gap-1">
          <Skeleton className="h-2.5 w-24" />
        </header>
        <div className="ring-foreground/10 bg-card overflow-hidden rounded-xl shadow-xs ring-1">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {["a", "b", "c", "d"].map((k) => (
              <div key={k} className="flex min-w-0 flex-col px-5 py-4">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="mt-3.5 h-7 w-20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <header className="mb-5 flex flex-col gap-1">
          <Skeleton className="h-2.5 w-28" />
        </header>
        <div className="ring-foreground/10 bg-card overflow-hidden rounded-xl shadow-xs ring-1">
          <div className="bg-border grid grid-cols-1 gap-px md:grid-cols-2 lg:grid-cols-4">
            {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
              <div key={k} className="bg-card flex flex-col px-5 py-4">
                <Skeleton className="h-2.5 w-28" />
                <div className="mt-3 flex flex-col gap-1">
                  <div className="flex gap-2 py-1">
                    <Skeleton className="h-2.5 w-6" />
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="ml-auto h-2.5 w-14" />
                  </div>
                  {["a", "b", "c"].map((r) => (
                    <div key={r} className="flex gap-2 py-1.5">
                      <Skeleton className="h-4 w-6" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="ml-auto h-4 w-14" />
                    </div>
                  ))}
                </div>
                <Skeleton className="mt-3 h-3 w-36" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
