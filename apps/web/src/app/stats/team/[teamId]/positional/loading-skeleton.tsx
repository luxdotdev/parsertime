import { Skeleton } from "@/components/ui/skeleton";

export function PositionalSkeleton() {
  return (
    <div className="mt-8 space-y-12">
      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-80" />
        </div>
        <div className="bg-border grid w-full grid-cols-2 gap-px overflow-hidden rounded-md sm:grid-cols-4">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <div key={k} className="bg-card flex flex-col px-4 py-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-1 h-7 w-20" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-36" />
        </div>
        <div className="bg-border grid w-full grid-cols-1 gap-px overflow-hidden rounded-md sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <div key={k} className="bg-card flex flex-col gap-2 p-4">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-[120px] w-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-40" />
        </div>
        <div className="space-y-px overflow-x-auto">
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-44" />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2.5">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton key={k} className="h-8 w-full rounded-[4px]" />
          ))}
        </div>
      </section>
    </div>
  );
}
