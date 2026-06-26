import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mt-8">
      <div className="space-y-12">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-80" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {["a", "b", "c", "d"].map((k) => (
              <div
                key={k}
                className="border-border space-y-3 rounded-md border p-4"
              >
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-56 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-80" />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {["x", "y"].map((k) => (
              <div key={k} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-9 w-[220px] rounded-md" />
              </div>
            ))}
          </div>
          <div className="border-border space-y-3 rounded-md border p-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-72 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
