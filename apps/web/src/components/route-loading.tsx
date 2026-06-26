import { Skeleton } from "@/components/ui/skeleton";

// Generic instant-navigation loading shell for route segments whose page reads
// request-time data. Next renders this as the segment's Suspense fallback, so
// the route paints immediately on navigation while its content streams in.
export function RouteLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pt-10 pb-16 sm:px-10">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <Skeleton key={key} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
