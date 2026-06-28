import { Skeleton } from "@/components/ui/skeleton";

export function TeamPageSkeleton() {
  return (
    <div className="min-h-[90vh] flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="space-y-4">
          <div className="inline-flex h-10 items-center gap-1 rounded-md p-1">
            <Skeleton className="h-8 w-16 rounded-sm" />
            <Skeleton className="h-8 w-14 rounded-sm" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-sm rounded-md" />
            <div className="border-border grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {["a", "b", "c", "d"].map((k) => (
                <div key={k} className="p-2">
                  <Skeleton className="h-36 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
