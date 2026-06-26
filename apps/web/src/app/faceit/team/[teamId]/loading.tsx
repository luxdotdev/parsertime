import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <header className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-48" />
          </div>
          <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
            {["a", "b", "c", "d"].map((k) => (
              <div key={k} className="flex flex-col gap-1 px-4 py-3">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </dl>
        </header>

        <section className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="border-border grid gap-x-10 gap-y-7 border-y py-6 sm:grid-cols-2">
            {["a", "b", "c", "d"].map((k) => (
              <div key={k} className="space-y-3">
                <Skeleton className="h-3 w-28" />
                {["x", "y", "z"].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-7">
              <Skeleton className="h-3 w-20" />
              <div className="flex flex-wrap gap-1.5">
                {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
                  <Skeleton key={k} className="size-7 rounded-sm" />
                ))}
              </div>
              <Skeleton className="h-6 w-full rounded-md" />
            </div>
            <div className="space-y-4 lg:col-span-5">
              <Skeleton className="h-3 w-28" />
              {["a", "b"].map((k) => (
                <div key={k} className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-full" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="border-border overflow-x-auto rounded-md border">
            <div className="divide-y divide-[var(--border)]">
              <Skeleton className="h-8 w-full rounded-none" />
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-10 w-full rounded-none" />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-36" />
          </div>
          {["a", "b"].map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <div className="border-border overflow-x-auto rounded-md border">
                <div className="divide-y divide-[var(--border)]">
                  <Skeleton className="h-8 w-full rounded-none" />
                  {["x", "y", "z", "w"].map((j) => (
                    <Skeleton key={j} className="h-10 w-full rounded-none" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="border-border overflow-x-auto rounded-md border">
            <div className="divide-y divide-[var(--border)]">
              <Skeleton className="h-8 w-full rounded-none" />
              {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
                <Skeleton key={k} className="h-10 w-full rounded-none" />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="border-border overflow-x-auto rounded-md border">
            <div className="divide-y divide-[var(--border)]">
              <Skeleton className="h-8 w-full rounded-none" />
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <Skeleton key={k} className="h-10 w-full rounded-none" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
