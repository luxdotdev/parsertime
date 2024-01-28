import { DefaultOverview } from "@/components/map/default-overview";
import { MainNav } from "@/components/map/main-nav";
import PlayerSwitcher from "@/components/map/player-switcher";
import { Search } from "@/components/map/search";
import { UserNav } from "@/components/user-nav";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function MapDashboardPage({
  params,
}: {
  params: { team: string; scrimId: string; mapId: string };
}) {
  const id = parseInt(params.mapId);

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
    <>
      <div className="hidden flex-col md:flex">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <PlayerSwitcher
              mostPlayedHeroes={uniquePlayerRowsByHeroTimePlayed}
            />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <ModeToggle />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div>
            <h4 className="text-gray-600 dark:text-gray-400">
              <Link href={`/${params.team}/scrim/${params.scrimId}`}>
                &larr; Back to scrim overview
              </Link>
            </h4>
          </div>
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {mapName?.map_name ?? "Dashboard"}
            </h2>
          </div>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <DefaultOverview id={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
