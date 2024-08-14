import { DefaultOverview } from "@/components/map/default-overview";
import { MainNav } from "@/components/dashboard/main-nav";
import PlayerSwitcher from "@/components/map/player-switcher";
import { Search } from "@/components/dashboard/search";
import { UserNav } from "@/components/user-nav";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { toTitleCase } from "@/lib/utils";
import { Killfeed } from "@/components/map/killfeed";
import { Metadata } from "next";
import { SearchParams } from "@/types/next";
import { MapCharts } from "@/components/charts/map/map-charts";
import { ComparePlayers } from "@/components/map/compare-players";
import { MapEvents } from "@/components/map/map-events";
import { auth } from "@/lib/auth";
import { GuestNav } from "@/components/guest-nav";
import { getMostPlayedHeroes } from "@/data/player-dto";
import { getUser } from "@/data/user-dto";

type Props = {
  params: { team: string; scrimId: string; mapId: string };
  searchParams: SearchParams;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mapId = decodeURIComponent(params.mapId);

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: parseInt(mapId),
    },
    select: {
      map_name: true,
    },
  });

  return {
    title: `${toTitleCase(mapName?.map_name || "Map")} Overview | Parsertime`,
    description: `Map overview for ${toTitleCase(
      mapName?.map_name || "Map"
    )} on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.`,
    openGraph: {
      title: `${toTitleCase(mapName?.map_name || "Map")} Overview | Parsertime`,
      description: `Map overview for ${toTitleCase(
        mapName?.map_name || "Map"
      )} on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.`,
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${toTitleCase(
            mapName?.map_name || "Map"
          )} Overview`,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en_US",
    },
  };
}

export default async function MapDashboardPage({ params }: Props) {
  const id = parseInt(params.mapId);
  const session = await auth();
  const user = await getUser(session?.user?.email);

  const mostPlayedHeroes = await getMostPlayedHeroes(id);

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      map_name: true,
    },
  });

  const map = await prisma.map.findFirst({
    where: {
      id,
    },
    select: {
      replayCode: true,
    },
  });

  const visibility = (await prisma.scrim.findFirst({
    where: {
      id: parseInt(params.scrimId),
    },
    select: {
      guestMode: true,
    },
  })) ?? { guestMode: false };

  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="hidden h-16 items-center px-4 md:flex">
          <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search user={user} />
            <ModeToggle />
            {session ? (
              <UserNav />
            ) : (
              <GuestNav guestMode={visibility.guestMode} />
            )}
          </div>
        </div>
        <div className="flex h-16 items-center px-4 md:hidden">
          <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
          <div className="ml-auto flex items-center space-x-4">
            <ModeToggle />
            {session ? (
              <UserNav />
            ) : (
              <GuestNav guestMode={visibility.guestMode} />
            )}
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
            {toTitleCase(mapName?.map_name ?? "Dashboard")}
            <div className="text-lg">{map?.replayCode ?? ""}</div>
          </h2>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="killfeed" className="hidden md:flex">
              Killfeed
            </TabsTrigger>
            <TabsTrigger value="killfeed" className="flex md:hidden">
              Kills
            </TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="events" className="hidden md:flex">
              Events
            </TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <DefaultOverview id={id} />
          </TabsContent>
          <TabsContent value="killfeed" className="space-y-4">
            <Killfeed id={id} />
          </TabsContent>
          <TabsContent value="charts" className="space-y-4">
            <MapCharts id={id} />
          </TabsContent>
          <TabsContent value="events" className="space-y-4">
            <MapEvents id={id} />
          </TabsContent>
          <TabsContent value="compare" className="space-y-4">
            <ComparePlayers id={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
