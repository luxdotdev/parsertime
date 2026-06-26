import { Skeleton } from "@/components/ui/skeleton";

// Instant-navigation loading shells for route segments whose page reads
// request-time data. Next renders these as a segment's Suspense fallback, so
// the route paints immediately on navigation while its content streams in.
// Each shell mirrors the shape of the page it stands in for, so the handoff to
// real content doesn't jump.

const FOUR = ["a", "b", "c", "d"];
const SIX = ["a", "b", "c", "d", "e", "f"];

function PageHeading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

// Generic fallback: a heading plus a card grid. Used where a page has no more
// specific shape.
export function RouteLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pt-10 pb-16 sm:px-10">
      <PageHeading />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SIX.map((key) => (
          <Skeleton key={key} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// Team-stats tabs: the flat-terminal SectionHeader + StatRibbon + a data panel.
// Renders without page padding since the team-stats layout already provides it.
export function StatsLoading() {
  return (
    <div className="mt-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="border-border grid grid-cols-2 divide-x divide-y border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
        {FOUR.map((key) => (
          <div key={key} className="flex flex-col gap-2 px-4 py-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

// List/feed pages (reports, tournaments, notifications, matchmaker): a heading
// over a stack of rows.
export function ListLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pt-10 pb-16 sm:px-10">
      <PageHeading />
      <div className="flex flex-col gap-2">
        {SIX.map((key) => (
          <Skeleton key={key} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// Detail pages (profile, scouting/faceit entities): an identity header, a stat
// ribbon, and a content panel.
export function DetailLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-6 pt-10 pb-16 sm:px-10">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FOUR.map((key) => (
          <Skeleton key={key} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

// Settings/form content. Renders without page padding since the settings layout
// already frames it beside the sidebar.
export function FormLoading() {
  return (
    <div className="max-w-2xl space-y-8">
      {FOUR.map((key) => (
        <div key={key} className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
