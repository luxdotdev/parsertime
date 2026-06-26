import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          {["a", "b", "c"].map((k) => (
            <div key={k} className="flex items-baseline gap-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-full sm:w-[280px]" />
        <div className="border-border bg-card flex rounded-md border p-0.5">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton key={k} className="h-8 w-16 rounded-sm" />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="hidden h-2.5 w-8 sm:block" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-1 gap-y-1">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <Skeleton key={k} className="h-5 w-20 rounded-sm" />
        ))}
      </div>

      <section className="mt-8">
        <div className="border-border grid grid-cols-[2.5rem_minmax(0,1fr)_5rem_5.5rem_5.5rem_5.5rem_4.5rem_5.5rem] items-center gap-4 border-b pb-3">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <Skeleton key={k} className="h-2.5 w-full" />
          ))}
        </div>
        <ul>
          {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
            <li
              key={k}
              className="border-border grid grid-cols-[2.5rem_minmax(0,1fr)_5rem_5.5rem_5.5rem_5.5rem_4.5rem_5.5rem] items-center gap-4 border-b py-3"
            >
              <Skeleton className="h-4 w-6" />
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-[4px]" />
                <div className="min-w-0 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
              </div>
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-12 justify-self-end" />
              <Skeleton className="h-4 w-10 justify-self-end" />
              <Skeleton className="h-4 w-10 justify-self-end" />
              <Skeleton className="h-4 w-8 justify-self-end" />
              <Skeleton className="h-4 w-10 justify-self-end" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
