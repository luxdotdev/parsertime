import { MapHeroTrends } from "@/components/stats/map/map-hero-trends";
import { Skeleton } from "@/components/ui/skeleton";
import { MapHeroTrendsService } from "@/data/map";
import { getOverwatchPatches } from "@/data/overwatch/patches-service";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Map Hero Trends | Parsertime",
  description: "Recent hero pick rates, winrates, and playtime trends by map.",
};

export default function MapHeroStatsPage() {
  return (
    <Suspense fallback={<MapHeroTrendsFallback />}>
      <MapHeroTrendsContent />
    </Suspense>
  );
}

async function MapHeroTrendsContent() {
  // The trends service reads Date.now() and the request locale, so render at
  // request time rather than prerendering.
  await connection();
  const [data, patches] = await Promise.all([
    AppRuntime.runPromise(
      MapHeroTrendsService.pipe(
        Effect.flatMap((svc) => svc.getRecentMapHeroTrends())
      )
    ),
    getOverwatchPatches(),
  ]);
  return (
    <MapHeroTrends
      allMaps={data.allMaps}
      perMap={data.perMap}
      patches={patches}
    />
  );
}

function MapHeroTrendsFallback() {
  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <div className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <Skeleton key={key} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
