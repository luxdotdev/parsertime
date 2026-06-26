import { MapHeroTrends } from "@/components/stats/map/map-hero-trends";
import { MapHeroTrendsService } from "@/data/map";
import { getOverwatchPatches } from "@/data/overwatch/patches-service";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import type { Metadata } from "next";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Map Hero Trends | Parsertime",
  description: "Recent hero pick rates, winrates, and playtime trends by map.",
};

export default async function MapHeroStatsPage() {
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
