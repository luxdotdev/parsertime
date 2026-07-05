import { MapTabsSkeleton } from "@/components/map/map-tabs-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// The map page's content skeleton (header bar, breadcrumb, title, tabs). Shared
// between the route's loading.tsx and the map layout's auth-gate fallback so the
// content region shows this skeleton — never a blank — while auth and the page's
// request data resolve.
export function MapPageSkeleton() {
  return (
    <div className="flex-col md:flex">
      <header
        className="shadow-xs"
        style={{ viewTransitionName: "site-header" }}
      >
        <div className="flex h-16 items-center px-4">
          <Skeleton className="h-6 w-24" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="hidden h-6 w-24 md:flex" />
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-6 md:hidden" />
            <Skeleton className="hidden h-6 w-24 md:flex" />
          </div>
        </div>
      </header>
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
