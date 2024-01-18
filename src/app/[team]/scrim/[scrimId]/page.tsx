import { DefaultOverview } from "@/components/map/default-overview";
import { MainNav } from "@/components/map/main-nav";
import PlayerSwitcher from "@/components/map/player-switcher";
import { Search } from "@/components/map/search";
import { UserNav } from "@/components/user-nav";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrismaClient } from "@prisma/client";

export default async function ScrimDashboardPage({
  params,
  searchParams,
}: {
  params: { team: string; scrimId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const prisma = new PrismaClient();
  const id = parseInt(params.scrimId);

  const uniquePlayerRowsByHeroTimePlayed = await prisma.playerStat.findMany({
    where: {
      scrimId: id,
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
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
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
