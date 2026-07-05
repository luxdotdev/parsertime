import { Skeleton } from "@/components/ui/skeleton";

export function UltimatesSkeleton() {
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

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <Skeleton className="h-9 w-full rounded-none" />
          <div className="divide-y divide-[var(--border)]">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-md" />
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-0.5">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <div key={k} className="flex items-center gap-3 py-1.5">
              <Skeleton className="h-6 w-40 shrink-0" />
              <div className="flex flex-1 items-center gap-3">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-56 w-full rounded-md" />
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-3 lg:divide-y-0">
          {["a", "b", "c"].map((k) => (
            <div key={k} className="flex flex-col gap-2 px-4 py-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </dl>
        <div className="border-border overflow-hidden rounded-md border">
          <Skeleton className="h-9 w-full rounded-none" />
          <div className="divide-y divide-[var(--border)]">
            {["a", "b"].map((k) => (
              <div key={k} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <dl className="border-border grid grid-cols-1 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-3 sm:divide-y-0">
          {["a", "b", "c"].map((k) => (
            <div key={k} className="flex flex-col gap-2 px-4 py-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </dl>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="space-y-0.5">
          {["a", "b", "c", "d", "e"].map((k) => (
            <div key={k} className="flex items-center gap-3 py-1.5">
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-4 w-20 shrink-0" />
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-md" />
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <Skeleton className="h-9 w-full rounded-none" />
          <div className="divide-y divide-[var(--border)]">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-md" />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <Skeleton className="h-9 w-full rounded-none" />
          <div className="divide-y divide-[var(--border)]">
            {["a", "b", "c", "d", "e"].map((k) => (
              <div key={k} className="px-4 py-3">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
