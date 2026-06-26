import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-white dark:bg-black">
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
            <Skeleton className="h-12 w-80 sm:h-16 sm:w-[480px]" />
            <Skeleton className="h-5 w-96" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <Skeleton className="h-9 w-64" />
          <div className="mt-8 space-y-6">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Skeleton className="h-9 w-56" />
          <div className="relative mt-12 ml-4 space-y-12 border-l-2 border-dashed border-gray-200 dark:border-white/10">
            {["a", "b", "c", "d", "e"].map((k) => (
              <div key={k} className="relative pl-8">
                <Skeleton className="mb-1 h-3.5 w-24" />
                <Skeleton className="mb-2 h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-1 h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl overflow-hidden px-6 py-32 sm:py-48 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-10 sm:mt-20 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((k) => (
            <div
              key={k}
              className="border-l border-gray-200 pl-6 dark:border-white/20"
            >
              <Skeleton className="h-7 w-28" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div
                key={k}
                className="rounded-2xl border border-gray-200 bg-white/50 p-6 dark:border-white/10 dark:bg-white/5"
              >
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="mt-4 h-4 w-32" />
                <div className="mt-2 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-12 lg:max-w-none lg:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-3.5 w-32" />
              <div className="mt-6 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <div className="mt-6 flex gap-x-4">
                {["a", "b", "c"].map((k) => (
                  <Skeleton key={k} className="h-5 w-5 rounded" />
                ))}
              </div>
            </div>
            <Skeleton className="h-[516px] w-[416px] rounded-2xl" />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white/50 p-8 sm:p-12 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="mt-3 h-4 w-32" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 sm:py-40">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 text-center lg:px-8">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-96" />
          <Skeleton className="h-5 w-72" />
          <div className="mt-6 flex gap-x-6">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-6 pt-4 pb-8 lg:px-8">
        <div className="flex items-center justify-between border-t border-gray-900/10 pt-8 dark:border-white/10">
          <Skeleton className="h-3.5 w-48" />
          <div className="flex space-x-6">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-6 w-6 rounded" />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
