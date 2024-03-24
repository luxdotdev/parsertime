import { DefaultOverview } from "@/components/player/default-overview";
import { MainNav } from "@/components/dashboard/main-nav";
import PlayerSwitcher from "@/components/map/player-switcher";
import { Search } from "@/components/dashboard/search";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { toTitleCase } from "@/lib/utils";
import { Metadata } from "next";
import { SearchParams } from "@/types/next";
import { PlayerCharts } from "@/components/charts/player/player-charts";
import { PlayerAnalytics } from "@/components/player/analytics";

type Props = {
  params: { team: string; scrimId: string; mapId: string; playerId: string };
  searchParams: SearchParams;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const playerName = decodeURIComponent(params.playerId);

  return {
    title: `${playerName} Overview | Parsertime`,
    description: `Player overview for ${playerName} on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.`,
    openGraph: {
      title: `${playerName} Overview | Parsertime`,
      description: `Player overview for ${playerName} on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.`,
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${playerName} Overview`,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en_US",
    },
  };
}

export default async function PlayerDashboardDemoPage({ params }: Props) {
  const id = 268;
  const playerName = decodeURIComponent(params.playerId);

  const uniquePlayerRowsByHeroTimePlayed = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
    },
    select: {
      player_name: true,
      player_team: true,
      player_hero: true,
      hero_time_played: true,
    },
    orderBy: {
      hero_time_played: "desc",
    },
    distinct: ["player_name"],
  });

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      map_name: true,
    },
  });

  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="hidden h-16 items-center px-4 md:flex">
          <PlayerSwitcher mostPlayedHeroes={uniquePlayerRowsByHeroTimePlayed} />
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <ModeToggle />
          </div>
        </div>
        <div className="flex h-16 items-center px-4 md:hidden">
          <PlayerSwitcher mostPlayedHeroes={uniquePlayerRowsByHeroTimePlayed} />
          <div className="ml-auto flex items-center space-x-4">
            <ModeToggle />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h4 className="text-gray-600 dark:text-gray-400">
            <Link href="/demo">&larr; Back to default overview</Link>
          </h4>
        </div>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {toTitleCase(mapName?.map_name ?? "Dashboard")}
          </h2>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <DefaultOverview id={id} playerName={playerName} />
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <PlayerAnalytics id={id} playerName={playerName} />
          </TabsContent>
          <TabsContent value="charts" className="space-y-4">
            <PlayerCharts id={id} playerName={playerName} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
