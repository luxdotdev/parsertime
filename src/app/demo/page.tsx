import { MapCharts } from "@/components/charts/map/map-charts";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ComparePlayers } from "@/components/map/compare-players";
import { DefaultOverview } from "@/components/map/default-overview";
import { HeroBans } from "@/components/map/hero-bans";
import { Killfeed } from "@/components/map/killfeed";
import { MapEvents } from "@/components/map/map-events";
import { PlayerSwitcher } from "@/components/map/player-switcher";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMostPlayedHeroes } from "@/data/player-dto";
import prisma from "@/lib/prisma";
import { toTitleCase, translateMapName } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export async function generateMetadata(
  props: PagePropsWithLocale<"/demo">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("demoPage.metadata");

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: 268,
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
  const id = 268;

  const mostPlayedHeroes = await getMostPlayedHeroes(id);

  const mapDetails = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      map_name: true,
      team_1_name: true,
    },
  });

  const translatedMapName = await translateMapName(
    mapDetails?.map_name ?? "Map"
  );

  const { team1, team2 } = {
    team1: "var(--team-1-off)",
    team2: "var(--team-2-off)",
  };

  const heroBans = await prisma.heroBan.findMany({
    where: { MapDataId: id },
  });

  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="hidden h-16 items-center px-4 md:flex">
          <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
          <MainNav className="mx-6" />
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
            <TabsTrigger value="events" className="hidden md:flex">
              {t("tabs.events")}
            </TabsTrigger>
            <TabsTrigger value="compare">{t("tabs.compare")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <DefaultOverview id={id} team1Color={team1} team2Color={team2} />
          </TabsContent>
          <TabsContent value="killfeed" className="space-y-4">
            <Killfeed id={id} team1Color={team1} team2Color={team2} />
          </TabsContent>
          <TabsContent value="charts" className="space-y-4">
            <MapCharts id={id} />
          </TabsContent>
          <TabsContent value="events" className="space-y-4">
            <MapEvents id={id} team1Color={team1} team2Color={team2} />
          </TabsContent>
          <TabsContent value="compare" className="space-y-4">
            <ComparePlayers id={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
