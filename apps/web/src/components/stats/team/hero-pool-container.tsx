import { HeroPickrateHeatmap } from "@/components/stats/team/hero-pickrate-heatmap";
import { HeroPoolOverviewCard } from "@/components/stats/team/hero-pool-overview-card";
import type { HeroPickrateMatrix } from "@/data/team/types";
import type { HeroPoolAnalysis } from "@/data/team/types";

type HeroPoolContainerProps = {
  initialData: HeroPoolAnalysis;
  heatmapInitialData: HeroPickrateMatrix;
};

export function HeroPoolContainer({
  initialData,
  heatmapInitialData,
}: HeroPoolContainerProps) {
  return (
    <div className="space-y-4">
      <HeroPoolOverviewCard heroPool={initialData} />
      <HeroPickrateHeatmap data={heatmapInitialData} />
    </div>
  );
}
