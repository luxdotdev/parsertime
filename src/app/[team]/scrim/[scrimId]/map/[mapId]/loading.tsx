import { DirectionalTransition } from "@/components/directional-transition";
import { MapTabsSkeleton } from "@/components/map/map-tabs-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MapDashboardLoading() {
  return (
    <DirectionalTransition>
      <div className="flex-col md:flex">
        <div className="border-b" style={{ viewTransitionName: "site-header" }}>
          <div className="flex h-16 items-center px-4">
            <Skeleton className="h-6 w-24" />
            <div className="ml-auto flex items-center space-x-4">
              <Skeleton className="hidden h-6 w-24 md:flex" />
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-6 md:hidden" />
              <Skeleton className="hidden h-6 w-24 md:flex" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div>
            <h4 className="text-gray-600 dark:text-gray-400">
              <Skeleton className="h-6 w-48" />
            </h4>
          </div>
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              <Skeleton className="h-10 w-40" />
            </h2>
          </div>
          <MapTabsSkeleton />
        </div>
      </div>
    </DirectionalTransition>
  );
}
