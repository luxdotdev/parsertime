import { MapTabsSkeleton } from "@/components/map/map-tabs-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// The map page's content skeleton (breadcrumb, title, tabs). Shared between
// the route's loading.tsx and the map layout's auth-gate fallback so the
// content region shows this skeleton — never a blank — while auth and the
// page's request data resolve. The top bar is NOT mirrored here: the map
// layout owns the header behind its own Suspense boundary.
export function MapPageSkeleton() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 px-6 pt-6 pb-12 md:px-8">
        <nav className="text-muted-foreground text-sm">
          <Skeleton className="h-5 w-48" />
        </nav>
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            <Skeleton className="h-8 w-40" />
          </h1>
        </div>
        <MapTabsSkeleton />
      </div>
    </div>
  );
}
