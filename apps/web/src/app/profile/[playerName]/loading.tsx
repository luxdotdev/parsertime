import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-8">
        <div className="flex items-end gap-5">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <div className="space-y-2 pb-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-9 w-44" />
          </div>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 pb-1">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </header>

      <div className="border-border mt-6 flex gap-6 border-b">
        {["a", "b", "c", "d", "e"].map((k) => (
          <Skeleton key={k} className="mb-3 h-3 w-16" />
        ))}
      </div>

      <div className="mt-8 space-y-12">
        <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="flex flex-col gap-1 px-4 py-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </dl>

        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-2 h-6 w-72" />
          </div>
          <div className="bg-border grid grid-cols-1 gap-px sm:grid-cols-2">
            {["a", "b"].map((k) => (
              <div key={k} className="bg-card flex flex-col gap-2 px-5 py-5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-56" />
          </div>
          <div className="bg-border grid grid-cols-1 gap-px sm:grid-cols-3">
            {["a", "b", "c"].map((k) => (
              <div
                key={k}
                className="bg-card flex items-center gap-4 px-5 py-5"
              >
                <Skeleton className="size-14 shrink-0 rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-48" />
          </div>
          <div className="bg-border grid grid-cols-1 gap-px">
            {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
              <div
                key={k}
                className="bg-card flex items-center gap-4 px-5 py-3"
              >
                <div className="flex min-w-[180px] items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-1.5 flex-1 rounded-full" />
                <Skeleton className="h-3 w-20 shrink-0" />
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-64" />
          </div>
          <div className="bg-border grid grid-cols-1 gap-px sm:grid-cols-3">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="bg-card flex flex-col gap-2 px-5 py-4">
                <Skeleton className="h-3 w-16" />
                <div className="flex items-baseline justify-between gap-3">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <Skeleton className="h-36 w-full rounded-md" />

        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-2 h-6 w-52" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
              <Skeleton key={k} className="h-20 w-full rounded-md" />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-2 h-6 w-72" />
            <Skeleton className="mt-1 h-4 w-56" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <Skeleton key={k} className="h-16 w-full rounded-md" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
