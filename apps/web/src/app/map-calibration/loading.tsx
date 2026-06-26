import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-9 w-full sm:max-w-xs" />
            <div className="flex gap-1">
              {["a", "b", "c", "d", "e"].map((k) => (
                <Skeleton key={k} className="h-7 w-16 rounded-md" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"].map(
              (k) => (
                <div key={k} className="border-border rounded-lg border p-4">
                  <div className="space-y-2 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-28" />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
