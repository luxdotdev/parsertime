import { Skeleton } from "@/components/ui/skeleton";

export function TeamDetailSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="space-y-4">
        <div className="flex gap-1">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border">
            <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b p-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-9 w-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-7 w-28" />
          <div className="-m-2 flex flex-wrap">
            {["a", "b", "c", "d", "e", "f"].map((k) => (
              <div key={k} className="w-full p-2 md:w-1/2 xl:w-1/3">
                <div className="overflow-hidden rounded-xl border pb-4">
                  <Skeleton className="aspect-[3/1] w-full rounded-none" />
                  <div className="relative px-6">
                    <Skeleton className="-mt-12 h-24 w-24 rounded-full" />
                    <div className="mt-4 space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-48 max-w-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4 pt-12">
            <Skeleton className="h-7 w-44" />
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
