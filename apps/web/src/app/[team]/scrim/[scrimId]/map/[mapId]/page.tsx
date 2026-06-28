import { AppHeader } from "@/components/app-header";
import { DirectionalTransition } from "@/components/directional-transition";
import { ActiveMapTab } from "@/components/map/active-map-tab";
import { HeroBans } from "@/components/map/hero-bans";
import { MapPageSkeleton } from "@/components/map/map-page-skeleton";
import { MapTabs } from "@/components/map/map-tabs";
import { MapTabsSkeleton } from "@/components/map/map-tabs-skeleton";
import { PlayerSwitcher } from "@/components/map/player-switcher";
import { ReplayCode } from "@/components/scrim/replay-code";
import { StatsViewBeacon } from "@/components/usage/stats-view-beacon";
import {
  getCachedMatchStory,
  getCachedMostPlayedHeroes,
} from "@/data/cached/map-cache";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { defaultLocale } from "@/i18n/config";
import { auth, isAuthedToViewMap } from "@/lib/auth";
import { positionalData, tempoChart } from "@/lib/flags";
import { resolveScrimMapDataId } from "@/lib/map-data-resolver";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { getColorblindMode } from "@/lib/server-utils";
import { translateMapName } from "@/lib/utils";
import type { PagePropsWithLocale, SearchParams } from "@/types/next";
import { Effect } from "effect";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]">
): Promise<Metadata> {
  const params = await props.params;
  const scrimId = parseInt(params.scrimId);
  const mapId = parseInt(decodeURIComponent(params.mapId));
  const canViewMap =
    Number.isSafeInteger(scrimId) &&
    Number.isSafeInteger(mapId) &&
    (await isAuthedToViewMap(scrimId, mapId));
  const t = getMetadataTranslations("mapPage.mapMetadata");

  const mapName = canViewMap
    ? await prisma.matchStart.findFirst({
        where: {
          MapDataId: await resolveScrimMapDataId(scrimId, mapId),
        },
        select: {
          map_name: true,
        },
      })
    : null;

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
      locale: defaultLocale,
    },
  };
}

export default function MapDashboardPage(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]"> & {
    searchParams: SearchParams;
  }
) {
  // The shell reads no request data, so the route prerenders a non-empty static
  // shell and navigations into a map (and between its tabs) update instantly.
  // Everything that reads request data — auth, locale, feature flags, params,
  // searchParams — lives in MapPageContent, behind the Suspense boundary, so it
  // streams in under the skeleton instead of blocking the navigation.
  return (
    <DirectionalTransition>
      <StatsViewBeacon />
      <Suspense fallback={<MapPageSkeleton />}>
        <MapPageContent
          params={props.params}
          searchParams={props.searchParams}
        />
      </Suspense>
    </DirectionalTransition>
  );
}

async function MapPageContent({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]">["params"];
  searchParams: SearchParams;
}) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const id = parseInt(params.mapId);
  const mapDataId = await resolveScrimMapDataId(parseInt(params.scrimId), id);
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
    tempoChartEnabled,
    positionalDataEnabled,
    matchStory,
  ] = await Promise.all([
    getCachedMostPlayedHeroes(id),
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
    tempoChart(),
    positionalData(),
    getCachedMatchStory(id, mapDataId),
  ]);

  const translatedMapName = await translateMapName(
    mapDetails?.map_name ?? "Map"
  );

  // Tab triggers are always shown; only the active tab's content is rendered.
  const tabs = [
    { value: "overview", label: t("tabs.overview") },
    { value: "killfeed", label: t("tabs.killfeed") },
    { value: "charts", label: t("tabs.charts") },
    ...(matchStory !== null
      ? [{ value: "story", label: t("tabs.story") }]
      : []),
    ...(positionalDataEnabled
      ? [
          { value: "heatmap", label: t("tabs.heatmap") },
          { value: "replay", label: t("tabs.replay") },
          { value: "routes", label: t("tabs.routes") },
        ]
      : []),
    { value: "events", label: t("tabs.events"), className: "hidden md:flex" },
    { value: "initiation", label: t("tabs.initiation") },
    { value: "compare", label: t("tabs.compare") },
    { value: "notes", label: t("tabs.notes") },
    { value: "vods", label: t("tabs.vod") },
  ];

  // Resolve the active tab from `?tab=`, falling back to overview for unknown
  // or feature-gated values.
  const requestedTab =
    typeof searchParams.tab === "string" ? searchParams.tab : "overview";
  const activeTab = tabs.some((tab) => tab.value === requestedTab)
    ? requestedTab
    : "overview";

  return (
    <div className="flex-col md:flex">
      <AppHeader
        switcher={<PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />}
        session={session}
        user={user}
        guestMode={visibility?.guestMode ?? false}
      />
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
        <ViewTransition enter="slide-up" default="none">
          <MapTabs tabs={tabs} activeTab={activeTab}>
            <Suspense
              key={activeTab}
              fallback={
                <ViewTransition exit="slide-down">
                  <MapTabsSkeleton />
                </ViewTransition>
              }
            >
              <ActiveMapTab
                activeTab={activeTab}
                id={id}
                mapDataId={mapDataId}
                scrimId={parseInt(params.scrimId)}
                team1Color={team1}
                team2Color={team2}
                tempoChartEnabled={tempoChartEnabled}
                positionalDataEnabled={positionalDataEnabled}
                matchStory={matchStory}
                noteContent={noteContent?.content ?? ""}
                vod={map?.vod ?? ""}
              />
            </Suspense>
          </MapTabs>
        </ViewTransition>
      </div>
    </div>
  );
}
