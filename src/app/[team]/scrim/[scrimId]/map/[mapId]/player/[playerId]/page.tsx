import { PlayerCharts } from "@/components/charts/player/player-charts";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { GuestNav } from "@/components/guest-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import PlayerSwitcher from "@/components/map/player-switcher";
import { PlayerAnalytics } from "@/components/player/analytics";
import { DefaultOverview } from "@/components/player/default-overview";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserNav } from "@/components/user-nav";
import { getMostPlayedHeroes } from "@/data/player-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toTitleCase } from "@/lib/utils";
import { SearchParams } from "@/types/next";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type Props = {
  params: {
    team: string;
    scrimId: string;
    mapId: string;
    playerId: string;
    locale: string;
  };
  searchParams: SearchParams;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "mapPage.playerMetadata",
  });
  const playerName = decodeURIComponent(params.playerId);

  return {
    title: t("title", { playerName }),
    description: t("description", { playerName }),
    openGraph: {
      title: t("ogTitle", { playerName }),
      description: t("ogDescription", { playerName }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", {
            playerName,
          })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function PlayerDashboardPage({ params }: Props) {
  const t = await getTranslations("mapPage.player.dashboard");
  const id = parseInt(params.mapId);
  const playerName = decodeURIComponent(params.playerId);

  const mostPlayedHeroes = await getMostPlayedHeroes(id);

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      map_name: true,
    },
  });

  const session = await auth();
  const user = await getUser(session?.user?.email);

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
            <Link
              href={`/${params.team}/scrim/${params.scrimId}/map/${params.mapId}`}
            >
              &larr; {t("back")}
            </Link>
            {" | "}
            <Link href={`/stats/${params.playerId}`}>
              {t("viewStats")} &rarr;
            </Link>
          </h4>
        </div>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {toTitleCase(mapName?.map_name ?? t("dashboard"))}
          </h2>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="analytics">{t("analytics")}</TabsTrigger>
            <TabsTrigger value="charts">{t("charts")}</TabsTrigger>
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
