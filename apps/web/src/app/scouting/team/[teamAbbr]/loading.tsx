import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-16 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40 rounded-md" />
        </div>

        <header className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
          <dl className="border-border grid grid-cols-2 divide-x divide-y border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
            {["a", "b", "c", "d"].map((k) => (
              <div key={k} className="flex flex-col gap-2 px-4 py-4">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </dl>
        </header>

        <section className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="border-border divide-border divide-y border-y">
            {["a", "b", "c", "d"].map((k) => (
              <div key={k} className="flex gap-3 py-4">
                <Skeleton className="mt-1.5 size-1.5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-2.5 w-24" />
            <div className="flex flex-wrap gap-1.5">
              {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
                <Skeleton key={k} className="size-7 rounded-sm" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-2.5 w-28" />
            <div className="border-border overflow-x-auto rounded-md border">
              <Skeleton className="h-9 w-full rounded-none" />
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <div
                  key={k}
                  className="border-border flex gap-4 border-t px-4 py-3"
                >
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="ml-auto h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-2.5 w-32" />
            <div className="border-border overflow-x-auto rounded-md border">
              <Skeleton className="h-9 w-full rounded-none" />
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <div
                  key={k}
                  className="border-border flex gap-4 border-t px-4 py-3"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-2.5 w-20" />
            <div className="border-border overflow-x-auto rounded-md border">
              <Skeleton className="h-9 w-full rounded-none" />
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <div
                  key={k}
                  className="border-border flex gap-4 border-t px-4 py-3"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="ml-auto h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-2.5 w-24" />
            <div className="border-border overflow-x-auto rounded-md border">
              <Skeleton className="h-9 w-full rounded-none" />
              {["a", "b", "c", "d"].map((k) => (
                <div
                  key={k}
                  className="border-border flex gap-4 border-t px-4 py-3"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="ml-auto h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Skeleton className="h-2.5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="border-border overflow-x-auto rounded-md border">
              <Skeleton className="h-9 w-full rounded-none" />
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <div
                  key={k}
                  className="border-border flex gap-4 border-t px-4 py-3"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {["a", "b"].map((k) => (
              <div key={k} className="space-y-3">
                <div className="space-y-1">
                  <Skeleton className="h-2.5 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <div className="border-border divide-border divide-y overflow-hidden rounded-md border">
                  {["a", "b", "c", "d", "e", "f"].map((j) => (
                    <div
                      key={j}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <Skeleton className="h-4 w-28 shrink-0" />
                      <Skeleton className="h-2.5 flex-1" />
                      <Skeleton className="h-4 w-8 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="border-border space-y-3 rounded-md border px-4 py-3">
            <Skeleton className="h-2.5 w-24" />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="border-border divide-border divide-y overflow-hidden rounded-md border">
              {["a", "b"].map((k) => (
                <div key={k} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          </div>
          {["a", "b", "c"].map((k) => (
            <div key={k} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Skeleton className="h-2.5 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
              <div className="border-border divide-border divide-y overflow-hidden rounded-md border">
                {["a", "b"].map((j) => (
                  <div key={j} className="space-y-2.5 px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                    <div className="space-y-2">
                      {["a", "b", "c"].map((m) => (
                        <div key={m} className="flex items-center gap-3">
                          <Skeleton className="h-4 w-28 shrink-0" />
                          <Skeleton className="h-3 flex-1" />
                          <Skeleton className="h-4 w-10 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
