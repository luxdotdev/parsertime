import { DirectionalTransition } from "@/components/directional-transition";
import { MapPageSkeleton } from "@/components/map/map-page-skeleton";

export default function MapDashboardLoading() {
  return (
    <DirectionalTransition>
      <MapPageSkeleton />
    </DirectionalTransition>
  );
}
