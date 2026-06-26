import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {["a", "b", "c"].map((k) => (
              <div key={k} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>

        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}
