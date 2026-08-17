import { AppHeader } from "@/components/app-header";
import { NoAuthCard } from "@/components/auth/no-auth";
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
  getCachedHeroBans,
  getCachedMapDetails,
  getCachedMapRow,
  getCachedMatchStory,
  getCachedMostPlayedHeroes,
  getCachedScrimVisibility,
} from "@/data/cached/map-cache";
import { getMapViewerContext } from "@/data/cached/map-viewer";
import { defaultLocale, type Locale } from "@/i18n/config";
import { coachingCanvas, positionalData, tempoChart } from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import { resolveScrimMapDataId } from "@/lib/map-data-resolver";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { translateMapName } from "@/lib/utils";
import type { PagePropsWithLocale, SearchParams } from "@/types/next";
import type { Metadata, Route } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

// Runtime prefetching: MapTabs prefetches `?tab=` URLs with kind:"full" on
// hover/trajectory, and the server can prerender the target tab ahead of the
// click because the render path below is fully cached (public caches for map
// data, "use cache: private" for the viewer context). The global
// `partialPrefetching` flag allows the runtime prefetch; no segment config
// needed (16.3 removed `prefetch = "allow-runtime"`).

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]">
): Promise<Metadata> {
  const params = await props.params;
  const scrimId = parseInt(params.scrimId);
  const mapId = parseInt(decodeURIComponent(params.mapId));
  // The gate goes through the private-cached viewer context: an uncached
  // session read here fails the route's runtime prefetches with "couldn't
  // prerender metadata" (E1370), and a slow read pushes the streamed <title>
  // chunk to the tail of the stream.
  const canViewMap =
    Number.isSafeInteger(scrimId) &&
    Number.isSafeInteger(mapId) &&
    (await getMapViewerContext(scrimId, mapId)).canView;
  const t = getMetadataTranslations("mapPage.mapMetadata");

  const mapName = canViewMap
    ? await getCachedMapDetails(
        mapId,
        await resolveScrimMapDataId(scrimId, mapId)
      )
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
  const scrimId = parseInt(params.scrimId);
  if (!Number.isSafeInteger(id) || !Number.isSafeInteger(scrimId)) {
    return <NoAuthCard />;
  }
  // The route's access gate — the [scrimId] layout no longer gates the
  // subtree (a layout gate adds a chrome-less loading phase above every
  // child route). The viewer context is "use cache: private" so runtime
  // prefetches can execute it (uncached session reads would abort them).
  const viewer = await getMapViewerContext(scrimId, id);
  if (!viewer.canView) {
    return <NoAuthCard />;
  }
  const mapDataId = await resolveScrimMapDataId(scrimId, id);
  const t = await getTranslations("mapPage");
  // The active tab components are cached ("use cache"), so the locale is
  // passed in as a prop/cache key rather than read from the cookie inside.
  const locale = (await getLocale()) as Locale;

  // Tournament context for back navigation
  const fromTournament = searchParams.from === "tournament";
  const tournamentId = searchParams.tournamentId as string | undefined;
  const matchId = searchParams.matchId as string | undefined;

  const [
    mostPlayedHeroes,
    mapDetails,
    map,
    visibility,
    heroBans,
    tempoChartEnabled,
    positionalDataEnabled,
    coachingCanvasEnabled,
    matchStory,
  ] = await Promise.all([
    getCachedMostPlayedHeroes(id),
    getCachedMapDetails(id, mapDataId),
    getCachedMapRow(scrimId, id),
    getCachedScrimVisibility(scrimId),
    getCachedHeroBans(id, mapDataId),
    getFlag(tempoChart),
    getFlag(positionalData),
    getFlag(coachingCanvas),
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
        session={viewer.session}
        user={viewer.user}
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
            {/* No key on this boundary: switching tabs re-suspends it inside
                MapTabs' transition, so the previous tab stays visible (dimmed,
                under the dot-matrix loader) instead of flashing the skeleton.
                The skeleton only shows on the initial stream. */}
            <Suspense
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
                scrimId={scrimId}
                locale={locale}
                team1Color={viewer.team1Color}
                team2Color={viewer.team2Color}
                tempoChartEnabled={tempoChartEnabled}
                positionalDataEnabled={positionalDataEnabled}
                coachingCanvasEnabled={coachingCanvasEnabled}
                matchStory={matchStory}
                vod={map?.vod ?? ""}
              />
            </Suspense>
          </MapTabs>
        </ViewTransition>
      </div>
    </div>
  );
}
