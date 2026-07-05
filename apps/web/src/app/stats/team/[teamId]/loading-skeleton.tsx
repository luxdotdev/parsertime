import {
  SkeletonRibbon,
  SkeletonSection,
  SkeletonTable,
} from "@/components/stats/team/overview-skeletons";

// The header and tab nav live in the persistent layout, so this skeleton only
// covers the page content that streams in per tab.
export function OverviewSkeleton() {
  return (
    <div className="mt-8 space-y-12">
      <SkeletonRibbon />
      <SkeletonSection bodyHeight={260} />
      <SkeletonTable rows={6} />
    </div>
  );
}
