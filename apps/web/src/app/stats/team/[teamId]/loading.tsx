import {
  SkeletonRibbon,
  SkeletonSection,
  SkeletonTable,
} from "@/components/stats/team/overview-skeletons";

// The header and tab nav live in the persistent layout, so this loading
// boundary only skeletons the page content that streams in per tab.
export default function TeamStatsLoading() {
  return (
    <div className="mt-8 space-y-12">
      <SkeletonRibbon />
      <SkeletonSection bodyHeight={260} />
      <SkeletonTable rows={6} />
    </div>
  );
}
