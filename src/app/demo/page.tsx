import { MapCharts } from "@/components/charts/map/map-charts";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { PremiumHighlight } from "@/components/demo/premium-highlight";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ComparePlayers } from "@/components/map/compare-players";
import { DefaultOverview } from "@/components/map/default-overview";
import { HeatmapTab } from "@/components/map/heatmap/heatmap-tab";
import { HeroBans } from "@/components/map/hero-bans";
import { Killfeed } from "@/components/map/killfeed";
import { MapEvents } from "@/components/map/map-events";
import { PlayerSwitcher } from "@/components/map/player-switcher";
import { ReplayTab } from "@/components/map/replay/replay-tab";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { PlayerService } from "@/data/player";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { toTitleCase, translateMapName } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

const DEMO_MAP_ID = 10148;

export async function generateMetadata(
  props: PagePropsWithLocale<"/demo">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("demoPage.metadata");
  const mapDataId = await resolveMapDataId(DEMO_MAP_ID);

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: mapDataId,
    },
    select: {
      map_name: true,
    },
  });

  return {
    title: t("title", { mapName: toTitleCase(mapName?.map_name ?? "Map") }),
    description: t("description", {
      mapName: toTitleCase(mapName?.map_name ?? "Map"),
    }),
    openGraph: {
      title: t("ogTitle", { mapName: toTitleCase(mapName?.map_name ?? "Map") }),
      description: t("ogDescription", {
        mapName: toTitleCase(mapName?.map_name ?? "Map"),
      }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", {
            mapName: toTitleCase(mapName?.map_name ?? "Map"),
          })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function MapDashboardPage() {
  const t = await getTranslations("mapPage");
  const id = DEMO_MAP_ID;
  const mapDataId = await resolveMapDataId(id);

  const [mostPlayedHeroes, mapDetails, heroBans] = await Promise.all([
    AppRuntime.runPromise(
      PlayerService.pipe(Effect.flatMap((svc) => svc.getMostPlayedHeroes(id)))
    ),
    prisma.matchStart.findFirst({
      where: { MapDataId: mapDataId },
      select: { map_name: true, team_1_name: true },
    }),
    prisma.heroBan.findMany({
      where: { MapDataId: mapDataId },
    }),
  ]);

  const translatedMapName = await translateMapName(
    mapDetails?.map_name ?? "Map"
  );

  const { team1, team2 } = {
    team1: "var(--team-1-off)",
    team2: "var(--team-2-off)",
  };

  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="hidden h-16 items-center px-4 md:flex">
          <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
          <MainNav className="mx-6" scoutingEnabled={false} />
          <div className="ml-auto flex items-center space-x-4">
            <Search user={null} />
            <ModeToggle />
            <LocaleSwitcher />
          </div>
        </div>
        <div className="flex h-16 items-center px-4 md:hidden">
          <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
          <div className="ml-auto flex items-center space-x-4">
            <ModeToggle />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h4 className="text-gray-600 dark:text-gray-400">
            <Link href="/">&larr; {t("back")}</Link>
          </h4>
        </div>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {translatedMapName}
          </h2>
          <HeroBans
            heroBans={heroBans}
            team1Name={mapDetails?.team_1_name ?? "Team 1"}
          />
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="killfeed" className="hidden md:flex">
              {t("tabs.killfeed")}
            </TabsTrigger>
            <TabsTrigger value="killfeed" className="flex md:hidden">
              {t("tabs.killfeed")}
            </TabsTrigger>
            <TabsTrigger value="charts">{t("tabs.charts")}</TabsTrigger>
            <TabsTrigger value="heatmap">{t("tabs.heatmap")}</TabsTrigger>
            <TabsTrigger value="replay">{t("tabs.replay")}</TabsTrigger>
            <TabsTrigger value="events" className="hidden md:flex">
              {t("tabs.events")}
            </TabsTrigger>
            <TabsTrigger value="compare">{t("tabs.compare")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <DefaultOverview
              id={id}
              team1Color={team1}
              team2Color={team2}
              positionalDataOverride
            />
          </TabsContent>
          <TabsContent value="killfeed" className="space-y-4">
            <Killfeed
              id={id}
              team1Color={team1}
              team2Color={team2}
              positionalDataOverride
              coachingCanvasOverride
            />
          </TabsContent>
          <TabsContent value="charts" className="space-y-4">
            <MapCharts id={id} />
          </TabsContent>
          <TabsContent value="heatmap" className="space-y-4">
            <PremiumHighlight>
              <HeatmapTab id={mapDataId} />
            </PremiumHighlight>
          </TabsContent>
          <TabsContent value="replay" className="space-y-4">
            <PremiumHighlight>
              <ReplayTab id={mapDataId} />
            </PremiumHighlight>
          </TabsContent>
          <TabsContent value="events" className="space-y-4">
            <MapEvents
              id={id}
              team1Color={team1}
              team2Color={team2}
              tempoChartEnabled
            />
          </TabsContent>
          <TabsContent value="compare" className="space-y-4">
            <ComparePlayers id={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
