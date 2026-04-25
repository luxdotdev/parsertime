import { MapHeroTrends } from "@/components/stats/map/map-hero-trends";
import { MapHeroTrendsService } from "@/data/map";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map Hero Trends | Parsertime",
  description: "Recent hero pick rates, winrates, and playtime trends by map.",
};

export default async function MapHeroStatsPage() {
  const data = await AppRuntime.runPromise(
    MapHeroTrendsService.pipe(
      Effect.flatMap((svc) => svc.getRecentMapHeroTrends())
    )
  );
  return <MapHeroTrends allMaps={data.allMaps} perMap={data.perMap} />;
}
