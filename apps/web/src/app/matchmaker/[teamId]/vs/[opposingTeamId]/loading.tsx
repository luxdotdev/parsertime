import { Skeleton } from "@/components/ui/skeleton";

function TsrCardSkeleton() {
  return (
    <div className="ring-foreground/10 bg-card flex flex-col gap-6 rounded-xl py-6 text-sm shadow-xs ring-1">
      <div className="border-border border-b px-6 pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="space-y-1">
            <Skeleton className="ml-auto h-8 w-20" />
            <Skeleton className="ml-auto h-2.5 w-28" />
          </div>
        </div>
      </div>
      <div className="space-y-6 px-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="h-12" />
        </div>
        <ul className="divide-border divide-y">
          {["a", "b", "c", "d", "e"].map((k) => (
            <li
              key={k}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5rem_4rem] items-center gap-4 py-2"
            >
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2.5 w-full" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-2.5 w-24" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {["f", "g"].map((k) => (
          <div key={k} className="space-y-2">
            <Skeleton className="h-2.5 w-16" />
            <TsrCardSkeleton />
          </div>
        ))}
      </div>

      <div className="border-border bg-card rounded-xl border p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="space-y-1">
            <Skeleton className="ml-auto h-7 w-16" />
            <Skeleton className="ml-auto h-2.5 w-10" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {["h", "i"].map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <div className="mt-2 space-y-3">
                <Skeleton className="h-2 w-full" />
                <div className="h-12" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-border bg-card space-y-2 rounded-xl border p-6">
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="border-border bg-card space-y-5 rounded-xl border p-6">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}
