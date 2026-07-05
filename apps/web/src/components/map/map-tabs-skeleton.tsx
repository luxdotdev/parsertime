import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function MapStatCellSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// Kept synchronous (no getTranslations) so it is a valid static Suspense
// fallback — a fallback that reads request data can't be prerendered and
// re-triggers the blocking-prerender warning. The placeholder region is
// decorative, so it is hidden from assistive tech rather than labelled.
export function MapTabsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-96" />
      <section aria-hidden className="space-y-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          <MapStatCellSkeleton />
          <MapStatCellSkeleton />
          <MapStatCellSkeleton />
          <MapStatCellSkeleton />
        </div>
        <Separator />
        <div className="rounded-md border">
          <Skeleton className="h-[70vh] w-full md:h-96" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-6 w-full md:w-1/2" />
          <Skeleton className="h-6 w-full md:w-1/3" />
          <Skeleton className="h-6 w-full md:w-2/5" />
        </div>
      </section>
    </div>
  );
}
