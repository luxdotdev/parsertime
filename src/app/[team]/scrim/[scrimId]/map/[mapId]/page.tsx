import { MapCharts } from "@/components/charts/map/map-charts";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { DirectionalTransition } from "@/components/directional-transition";
import { GuestNav } from "@/components/guest-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ComparePlayers } from "@/components/map/compare-players";
import { DefaultOverview } from "@/components/map/default-overview";
import { HeatmapTab } from "@/components/map/heatmap/heatmap-tab";
import { ReplayTab } from "@/components/map/replay/replay-tab";
import { HeroBans } from "@/components/map/hero-bans";
import { Killfeed } from "@/components/map/killfeed";
import { MapEvents } from "@/components/map/map-events";
import { MapTabs } from "@/components/map/map-tabs";
import { PlayerSwitcher } from "@/components/map/player-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { Notifications } from "@/components/notifications";
import { ReplayCode } from "@/components/scrim/replay-code";
import { ModeToggle } from "@/components/theme-switcher";
import { TipTap } from "@/components/tiptap/tiptap";
import { MapTabsSkeleton } from "@/components/map/map-tabs-skeleton";
import { Suspense, ViewTransition } from "react";
import { UserNav } from "@/components/user-nav";
import { VodOverview } from "@/components/vods/vod-overview";
import { PlayerService } from "@/data/player";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import {
  aiChat,
  coachingCanvas,
  dataLabeling,
  positionalData,
  scoutingTool,
  tempoChart,
  tournament,
} from "@/lib/flags";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { getColorblindMode, translateMapName } from "@/lib/utils";
import type { PagePropsWithLocale, SearchParams } from "@/types/next";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]">
): Promise<Metadata> {
  const params = await props.params;
  const mapId = decodeURIComponent(params.mapId);
  const metadataMapDataId = await resolveMapDataId(parseInt(mapId));
  const t = await getTranslations({
    locale: params.locale,
    namespace: "mapPage.mapMetadata",
  });

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: metadataMapDataId,
    },
    select: {
      map_name: true,
    },
  });

  const translatedMapName = await translateMapName(mapName?.map_name ?? "Map");

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

export default async function MapDashboardPage(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]"> & {
    searchParams: SearchParams;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const id = parseInt(params.mapId);
  const mapDataId = await resolveMapDataId(id);
  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );
  const t = await getTranslations("mapPage");

  // Tournament context for back navigation
  const fromTournament = searchParams.from === "tournament";
  const tournamentId = searchParams.tournamentId as string | undefined;
  const matchId = searchParams.matchId as string | undefined;

  const { team1, team2 } = await getColorblindMode(user?.id ?? "");

  const [
    mostPlayedHeroes,
    mapDetails,
    map,
    visibility,
    heroBans,
    noteContent,
    scoutingEnabled,
    tempoChartEnabled,
    positionalDataEnabled,
    aiChatEnabled,
    dataToolsEnabled,
    tournamentEnabled,
    coachingCanvasEnabled,
  ] = await Promise.all([
    AppRuntime.runPromise(
      PlayerService.pipe(Effect.flatMap((svc) => svc.getMostPlayedHeroes(id)))
    ),
    prisma.matchStart.findFirst({
      where: { MapDataId: mapDataId },
      select: { map_name: true, team_1_name: true },
    }),
    prisma.map.findFirst({
      where: { id },
      select: { replayCode: true, vod: true },
    }),
    prisma.scrim.findFirst({
      where: { id: parseInt(params.scrimId) },
      select: { guestMode: true },
    }),
    prisma.heroBan.findMany({
      where: { MapDataId: mapDataId },
    }),
    prisma.note.findFirst({
      where: {
        scrimId: parseInt(params.scrimId),
        MapDataId: mapDataId,
      },
      select: { content: true },
    }),
    scoutingTool(),
    tempoChart(),
    positionalData(),
    aiChat(),
    dataLabeling(),
    tournament(),
    coachingCanvas(),
  ]);

  const translatedMapName = await translateMapName(
    mapDetails?.map_name ?? "Map"
  );

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
              tournamentEnabled={tournamentEnabled}
              coachingCanvasEnabled={coachingCanvasEnabled}
            />
            <MobileNav
              className="block pl-2 lg:hidden"
              session={session}
              aiChatEnabled={aiChatEnabled}
              dataToolsEnabled={dataToolsEnabled}
              coachingCanvasEnabled={coachingCanvasEnabled}
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
                <GuestNav guestMode={visibility?.guestMode ?? false} />
              )}
            </div>
          </div>
          <div className="flex h-16 items-center px-4 md:hidden">
            <MobileNav
              session={session}
              aiChatEnabled={aiChatEnabled}
              dataToolsEnabled={dataToolsEnabled}
              coachingCanvasEnabled={coachingCanvasEnabled}
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
                <GuestNav guestMode={visibility?.guestMode ?? false} />
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 space-y-4 px-6 pt-6 pb-12 md:px-8">
          <nav className="text-muted-foreground text-sm">
            <Link
              href={
                (fromTournament && tournamentId && matchId
                  ? `/tournaments/${tournamentId}/match/${matchId}`
                  : `/${params.team}/scrim/${params.scrimId}`) as Route
              }
              transitionTypes={["contract-map"]}
              className="hover:text-foreground"
            >
              &larr; {t("back")}
            </Link>
          </nav>
          <div className="flex items-center justify-between space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {translatedMapName}
            </h1>
            <HeroBans
              heroBans={heroBans}
              team1Name={mapDetails?.team_1_name ?? "Team 1"}
            />
          </div>
          <div className="font-semibold tracking-tight">
            {map?.replayCode && (
              <ReplayCode replayCode={map?.replayCode ?? ""} subtitle={true} />
            )}
          </div>
          <Suspense
            fallback={
              <ViewTransition exit="slide-down">
                <MapTabsSkeleton />
              </ViewTransition>
            }
          >
            <ViewTransition enter="slide-up" default="none">
              <MapTabs
                tabs={[
                  {
                    value: "overview",
                    label: t("tabs.overview"),
                    content: (
                      <DefaultOverview
                        id={id}
                        team1Color={team1}
                        team2Color={team2}
                      />
                    ),
                  },
                  {
                    value: "killfeed",
                    label: t("tabs.killfeed"),
                    content: (
                      <Killfeed id={id} team1Color={team1} team2Color={team2} />
                    ),
                  },
                  {
                    value: "charts",
                    label: t("tabs.charts"),
                    content: (
                      <MapCharts
                        id={id}
                        team1Color={team1}
                        team2Color={team2}
                        tempoChartEnabled={tempoChartEnabled}
                      />
                    ),
                  },
                  ...(positionalDataEnabled
                    ? [
                        {
                          value: "heatmap",
                          label: t("tabs.heatmap"),
                          content: <HeatmapTab id={mapDataId} />,
                        },
                        {
                          value: "replay",
                          label: t("tabs.replay"),
                          content: <ReplayTab id={mapDataId} />,
                        },
                      ]
                    : []),
                  {
                    value: "events",
                    label: t("tabs.events"),
                    className: "hidden md:flex",
                    content: (
                      <MapEvents
                        id={id}
                        team1Color={team1}
                        team2Color={team2}
                      />
                    ),
                  },
                  {
                    value: "compare",
                    label: t("tabs.compare"),
                    content: <ComparePlayers id={id} />,
                  },
                  {
                    value: "notes",
                    label: t("tabs.notes"),
                    content: (
                      <TipTap
                        noteContent={noteContent?.content ?? ""}
                        mapDataId={mapDataId}
                        scrimId={parseInt(params.scrimId)}
                      />
                    ),
                  },
                  {
                    value: "vods",
                    label: t("tabs.vod"),
                    content: <VodOverview vod={map?.vod ?? ""} mapId={id} />,
                  },
                ]}
              />
            </ViewTransition>
          </Suspense>
        </div>
      </div>
    </DirectionalTransition>
  );
}
