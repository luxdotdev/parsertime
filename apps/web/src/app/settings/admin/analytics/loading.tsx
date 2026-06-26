import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-1 h-4 w-80" />
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-9 w-40" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <div key={k} className="rounded-lg border p-4">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="mt-3 h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-6">
        <div className="bg-muted flex gap-1 rounded-lg p-1">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton key={k} className="h-7 w-20 rounded-md" />
          ))}
        </div>
        <div className="space-y-6">
          {["a", "b", "c", "d", "e"].map((k) => (
            <div key={k} className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border p-6">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-1.5 h-4 w-56" />
                <Skeleton className="mt-4 h-64 w-full rounded-md" />
              </div>
              <div className="rounded-lg border p-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-1.5 h-4 w-52" />
                <Skeleton className="mt-4 h-64 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
