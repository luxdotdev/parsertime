import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-5" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="flex-1 rounded-lg border p-6">
        <div className="space-y-8">
          <div>
            <Skeleton className="mb-4 h-6 w-28" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          </div>

          <div>
            <Skeleton className="mb-4 h-6 w-48" />
            <div className="space-y-6">
              {["a", "b", "c"].map((k) => (
                <div key={k}>
                  <Skeleton className="mb-3 h-3 w-24" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {["x", "y", "z"].map((m) => (
                      <Skeleton key={m} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Skeleton className="mb-4 h-6 w-24" />
            <div className="flex min-h-[30vh] items-stretch gap-8">
              {["a", "b", "c"].map((k) => (
                <div key={k} className="flex min-w-56 flex-1 flex-col">
                  <Skeleton className="mx-auto mb-3 h-3 w-20" />
                  <div className="flex flex-1 flex-col justify-around gap-2">
                    {["x", "y"].map((m) => (
                      <Skeleton key={m} className="h-20 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
