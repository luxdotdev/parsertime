import { MapHeroTrends } from "@/components/stats/map/map-hero-trends";
import { MapHeroTrendsService } from "@/data/map";
import { getOverwatchPatches } from "@/data/overwatch/patches-service";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";

export const metadata: Metadata = {
  title: "Map Hero Trends | Parsertime",
  description: "Recent hero pick rates, winrates, and playtime trends by map.",
};

// Recent trends are an expensive aggregation that moves slowly; cache them so
// the page prerenders. The service's time-window `Date.now()` resolves once at
// cache fill, which Cache Components permits inside `use cache`.
async function getMapHeroStats() {
  "use cache";
  cacheLife("hours");

  const [data, patches] = await Promise.all([
    AppRuntime.runPromise(
      MapHeroTrendsService.pipe(
        Effect.flatMap((svc) => svc.getRecentMapHeroTrends())
      )
    ),
    getOverwatchPatches(),
  ]);
  return { data, patches };
}

export default async function MapHeroStatsPage() {
  const { data, patches } = await getMapHeroStats();
  return (
    <MapHeroTrends
      allMaps={data.allMaps}
      perMap={data.perMap}
      patches={patches}
    />
  );
}
