import { MapCharts } from "@/components/charts/map/map-charts";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { GuestNav } from "@/components/guest-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ComparePlayers } from "@/components/map/compare-players";
import { DefaultOverview } from "@/components/map/default-overview";
import { Killfeed } from "@/components/map/killfeed";
import { MapEvents } from "@/components/map/map-events";
import PlayerSwitcher from "@/components/map/player-switcher";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserNav } from "@/components/user-nav";
import { getMostPlayedHeroes } from "@/data/player-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { translateMapName } from "@/lib/utils";
import { SearchParams } from "@/types/next";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type Props = {
  params: { team: string; scrimId: string; mapId: string; locale: string };
  searchParams: SearchParams;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mapId = decodeURIComponent(params.mapId);
  const t = await getTranslations({
    locale: params.locale,
    namespace: "mapPage.mapMetadata",
  });

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: parseInt(mapId),
    },
    select: {
      map_name: true,
    },
  });

  const translatedMapName = await translateMapName(mapName?.map_name || "Map");

  return {
    title: t("title", { mapName: translatedMapName }),
    description: t("description", { mapName: translatedMapName }),
    openGraph: {
      title: t("ogTitle", { mapName: translatedMapName }),
      description: t("ogDescription", { mapName: translatedMapName }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", { mapName: translatedMapName })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function MapDashboardPage({ params }: Props) {
  const id = parseInt(params.mapId);
  const session = await auth();
  const user = await getUser(session?.user?.email);
  const t = await getTranslations("mapPage");

  const mostPlayedHeroes = await getMostPlayedHeroes(id);

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      map_name: true,
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

  const translatedMapName = await translateMapName(mapName?.map_name || "Map");

  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="hidden h-16 items-center px-4 md:flex">
          <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search user={user} />
            <ModeToggle />
            <LocaleSwitcher />
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
            <LocaleSwitcher />
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
              &larr; {t("back")}
            </Link>
          </h4>
        </div>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {translatedMapName}
          </h2>
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
