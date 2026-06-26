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

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-3 lg:divide-y-0">
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <div key={k} className="flex flex-col gap-1 px-4 py-4">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-3 lg:divide-y-0">
          {["a", "b", "c"].map((k) => (
            <div key={k} className="flex flex-col gap-1 px-4 py-4">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <div key={k} className="space-y-1">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="mb-3 h-2.5 w-28" />
            <Skeleton className="h-52 w-full rounded-md" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-64 shrink-0" />
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <div className="bg-muted/30 flex gap-6 px-4 py-2">
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <Skeleton key={k} className="h-2.5 w-16" />
            ))}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {["a", "b"].map((k) => (
              <div key={k} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-7 w-7 shrink-0 rounded" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="ml-auto flex gap-8">
                  {["a", "b", "c", "d", "e"].map((j) => (
                    <Skeleton key={j} className="h-4 w-12" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
