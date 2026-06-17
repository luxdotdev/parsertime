import { MapHeroTrends } from "@/components/stats/map/map-hero-trends";
import { MapHeroTrendsService } from "@/data/map";
import { getOverwatchPatches } from "@/data/overwatch/patches-service";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map Hero Trends | Parsertime",
  description: "Recent hero pick rates, winrates, and playtime trends by map.",
};

export default async function MapHeroStatsPage() {
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
