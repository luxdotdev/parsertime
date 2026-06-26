import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-full space-y-4">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-1.5 h-4 w-64" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((k) => (
          <div key={k} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex gap-1">
          {["a", "b"].map((k) => (
            <Skeleton key={k} className="h-9 w-28 rounded-md" />
          ))}
        </div>

        <div className="rounded-lg border">
          <div className="space-y-1.5 p-6 pb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-4 p-6 pt-0">
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
