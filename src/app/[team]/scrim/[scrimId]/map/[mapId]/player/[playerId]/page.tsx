import { PlayerCharts } from "@/components/charts/player/player-charts";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { DirectionalTransition } from "@/components/directional-transition";
import { GuestNav } from "@/components/guest-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PlayerSwitcher } from "@/components/map/player-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { Notifications } from "@/components/notifications";
import { PlayerAnalytics } from "@/components/player/analytics";
import { DefaultOverview } from "@/components/player/default-overview";
import { ModeToggle } from "@/components/theme-switcher";
import { Link } from "@/components/ui/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserNav } from "@/components/user-nav";
import { PlayerService } from "@/data/player";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { aiChat, dataLabeling, scoutingTool } from "@/lib/flags";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { translateHeroName, translateMapName } from "@/lib/utils";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]/player/[playerId]">
): Promise<Metadata> {
  const params = await props.params;
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

export default async function PlayerDashboardPage(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]/player/[playerId]">
) {
  const params = await props.params;
  const t = await getTranslations("mapPage.player.dashboard");
  const id = parseInt(params.mapId);
  const mapDataId = await resolveMapDataId(id);
  const playerName = decodeURIComponent(params.playerId);

  const mostPlayedHeroes = await AppRuntime.runPromise(
    PlayerService.pipe(Effect.flatMap((svc) => svc.getMostPlayedHeroes(id)))
  );

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: mapDataId,
    },
    select: {
      map_name: true,
    },
  });

  const playerEntry = mostPlayedHeroes.find(
    (entry) => entry.player_name === playerName
  );
  const topHero = playerEntry?.player_hero as HeroName | undefined;
  const role = topHero ? heroRoleMapping[topHero] : null;
  const heroDisplayName = topHero ? await translateHeroName(topHero) : null;
  const translatedMapName = await translateMapName(
    mapName?.map_name ?? t("dashboard")
  );

  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  const visibility = (await prisma.scrim.findFirst({
    where: {
      id: parseInt(params.scrimId),
    },
    select: {
      guestMode: true,
    },
  })) ?? { guestMode: false };

  const [scoutingEnabled, aiChatEnabled, dataToolsEnabled] = await Promise.all([
    scoutingTool(),
    aiChat(),
    dataLabeling(),
  ]);

  return (
    <DirectionalTransition>
      <div className="flex-col md:flex">
        <header
          className="shadow-xs"
          style={{ viewTransitionName: "site-header" }}
        >
          <div className="hidden min-h-16 items-center px-4 py-2 md:flex">
            <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
            <MainNav
              className="mx-6 hidden lg:block"
              scoutingEnabled={scoutingEnabled}
              aiChatEnabled={aiChatEnabled}
              dataToolsEnabled={dataToolsEnabled}
            />
            <MobileNav
              className="block pl-2 lg:hidden"
              session={session}
              aiChatEnabled={aiChatEnabled}
              dataToolsEnabled={dataToolsEnabled}
            />
            <div className="ml-auto flex items-center space-x-4">
              <Search user={user} />
              <ModeToggle />
              <LocaleSwitcher />
              {session ? (
                <>
                  <Notifications />
                  <UserNav />
                </>
              ) : (
                <GuestNav guestMode={visibility.guestMode} />
              )}
            </div>
          </div>
          <div className="flex h-16 items-center px-4 md:hidden">
            <MobileNav
              session={session}
              aiChatEnabled={aiChatEnabled}
              dataToolsEnabled={dataToolsEnabled}
            />
            <div className="ml-auto flex items-center space-x-4">
              <ModeToggle />
              <LocaleSwitcher />
              {session ? (
                <>
                  <Notifications />
                  <UserNav />
                </>
              ) : (
                <GuestNav guestMode={visibility.guestMode} />
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
          <nav className="text-muted-foreground flex items-center gap-3 text-sm">
            <Link
              href={
                `/${params.team}/scrim/${params.scrimId}/map/${params.mapId}` as Route
              }
              transitionTypes={["nav-back"]}
              className="hover:text-foreground"
            >
              &larr; {t("back")}
            </Link>
            <span className="text-muted-foreground/40" aria-hidden="true">
              |
            </span>
            <Link
              href={`/stats/${params.playerId}` as Route}
              transitionTypes={["nav-forward"]}
              className="hover:text-foreground"
            >
              {t("viewStats")} &rarr;
            </Link>
          </nav>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold tracking-tight break-words">
              {playerName}
            </h1>
          </div>

          <div
            className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] tracking-[0.06em] uppercase tabular-nums"
            aria-label="Player metadata"
          >
            <span>{translatedMapName}</span>
            {role && (
              <>
                <span className="text-muted-foreground/40" aria-hidden="true">
                  ·
                </span>
                <span>{role}</span>
              </>
            )}
            {heroDisplayName && (
              <>
                <span className="text-muted-foreground/40" aria-hidden="true">
                  ·
                </span>
                <span>{heroDisplayName}</span>
              </>
            )}
            {playerEntry?.player_team && (
              <>
                <span className="text-muted-foreground/40" aria-hidden="true">
                  ·
                </span>
                <span>{playerEntry.player_team}</span>
              </>
            )}
          </div>

          <Tabs defaultValue="overview" className="mt-6 space-y-4">
            <TabsList aria-label="Player sections">
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
    </DirectionalTransition>
  );
}
