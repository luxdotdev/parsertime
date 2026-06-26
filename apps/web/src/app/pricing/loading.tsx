import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-white dark:bg-black">
      <main>
        <section className="relative py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
              <Skeleton className="h-14 w-80 sm:h-16 sm:w-[32rem]" />
              <Skeleton className="h-5 w-96 max-w-full" />
              <Skeleton className="h-5 w-64 max-w-full" />
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {["a", "b", "c"].map((k) => (
                <div key={k} className="rounded-2xl border p-8">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="mt-2 h-4 w-48" />
                  <Skeleton className="mt-6 h-10 w-24" />
                  <Skeleton className="mt-8 h-10 w-full" />
                  <div className="mt-8 space-y-3">
                    {["p", "q", "r", "s", "t", "u", "v", "w"].map((item) => (
                      <Skeleton key={item} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-md space-y-8 lg:hidden">
              {["a", "b", "c"].map((k) => (
                <div key={k} className="rounded-2xl border p-8">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-2 h-10 w-24" />
                  <Skeleton className="mt-8 h-10 w-full" />
                  <div className="mt-10 space-y-4">
                    {["p", "q", "r", "s", "t"].map((item) => (
                      <Skeleton key={item} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 hidden lg:block">
              <div className="grid grid-cols-4 gap-x-8 pb-8">
                <div />
                {["a", "b", "c"].map((k) => (
                  <div key={k} className="space-y-2 px-6">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="mt-4 h-9 w-full" />
                  </div>
                ))}
              </div>
              {["fa", "fb", "fc", "fd", "fe"].map((section) => (
                <div key={section} className="mt-10">
                  <Skeleton className="mb-4 h-4 w-32" />
                  <div className="space-y-4">
                    {["r1", "r2", "r3", "r4", "r5"].map((row) => (
                      <div key={row} className="grid grid-cols-4 gap-x-8 py-2">
                        <Skeleton className="h-4 w-40" />
                        {["c1", "c2", "c3"].map((col) => (
                          <Skeleton key={col} className="mx-auto h-4 w-4" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pt-32 sm:pt-48 lg:px-8">
          <Skeleton className="mx-auto mb-8 h-5 w-64" />
          <div className="flex justify-around gap-8 overflow-hidden py-2">
            {["a", "b", "c", "d", "e", "f", "g"].map((k) => (
              <Skeleton key={k} className="h-8 w-24 flex-none" />
            ))}
          </div>
        </section>

        <section className="px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="flex gap-x-1">
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-5 w-5 flex-none" />
              ))}
            </div>
            <div className="mt-10 space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="mt-10 flex items-center gap-x-6">
              <Skeleton className="h-12 w-12 flex-none rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="space-y-4 lg:col-span-5">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-80 max-w-full" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
              <div className="mt-10 lg:col-span-7 lg:mt-0">
                <div className="space-y-10">
                  {["a", "b", "c", "d", "e", "f"].map((k) => (
                    <div key={k} className="space-y-2">
                      <Skeleton className="h-5 w-72 max-w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-32 sm:py-40">
          <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
            <Skeleton className="mx-auto h-8 w-72" />
            <Skeleton className="mx-auto mt-2 h-8 w-56" />
            <Skeleton className="mx-auto mt-6 h-5 w-96 max-w-full" />
            <Skeleton className="mx-auto mt-2 h-5 w-80 max-w-full" />
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Skeleton className="h-11 w-36" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pt-4 pb-8 lg:px-8">
        <div className="flex items-center justify-between border-t border-gray-900/10 pt-8 dark:border-white/10">
          <Skeleton className="h-3 w-48" />
          <div className="flex space-x-6">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-6 w-6" />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
