import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-28 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="space-y-2 rounded-lg border p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-9 w-full rounded-md" />

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>

            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex items-center gap-2">
                {["a", "b", "c", "d", "e"].map((k) => (
                  <Skeleton key={k} className="h-12 w-12 rounded-md" />
                ))}
              </div>
              {["a", "b", "c"].map((k) => (
                <div key={k} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-11 w-full rounded-md" />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <div className="space-y-1">
                {["a", "b", "c", "d", "e"].map((k) => (
                  <Skeleton key={k} className="h-10 w-full rounded-md" />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex items-center gap-2">
                {["f", "g", "h", "i", "j"].map((k) => (
                  <Skeleton key={k} className="h-12 w-12 rounded-md" />
                ))}
              </div>
              {["f", "g", "h"].map((k) => (
                <div key={k} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-11 w-full rounded-md" />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <div className="space-y-1">
                {["f", "g", "h", "i", "j"].map((k) => (
                  <Skeleton key={k} className="h-10 w-full rounded-md" />
                ))}
              </div>
            </div>

            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
