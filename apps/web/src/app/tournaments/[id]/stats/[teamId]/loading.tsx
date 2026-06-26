import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-5 rounded-sm" />
          <Skeleton className="size-[100px] rounded-full" />
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((k) => (
          <Skeleton key={k} className="h-9 w-22 rounded-sm" />
        ))}
      </div>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-36" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-32" />
          </div>
          <div className="space-y-2">
            {["a", "b", "c", "d", "e"].map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-40" />
          </div>
          <Skeleton className="h-48 w-full rounded-sm" />
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-28" />
          </div>
          <div className="space-y-4">
            {["a", "b", "c", "d", "e"].map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-48" />
          </div>
          <div className="space-y-3">
            {["a", "b"].map((k) => (
              <Skeleton key={k} className="h-16 w-full" />
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-40" />
        </div>
        <Skeleton className="h-72 w-full rounded-sm" />
      </section>
    </div>
  );
}
