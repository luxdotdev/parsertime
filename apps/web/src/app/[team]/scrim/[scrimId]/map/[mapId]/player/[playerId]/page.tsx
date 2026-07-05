import { NoAuthCard } from "@/components/auth/no-auth";
import { PlayerCharts } from "@/components/charts/player/player-charts";
import { DirectionalTransition } from "@/components/directional-transition";
import { PlayerAnalytics } from "@/components/player/analytics";
import { DefaultOverview } from "@/components/player/default-overview";
import { PlayerTelemetry } from "@/components/player/player-telemetry";
import { StatPanel } from "@/components/player/stat-panel";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCachedMostPlayedHeroes } from "@/data/cached/map-cache";
import { defaultLocale } from "@/i18n/config";
import { isAuthedToViewMap } from "@/lib/auth";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { translateHeroName, translateMapName } from "@/lib/utils";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]/player/[playerId]">
): Promise<Metadata> {
  const params = await props.params;
  const t = getMetadataTranslations("mapPage.playerMetadata");
  const playerName = decodeURIComponent(params.playerId);

  return {
    title: t("title", { playerName }),
    description: t("description", { playerName }),
    openGraph: {
      title: t("ogTitle", { playerName }),
      description: t("ogDescription", { playerName }),
      url: "/",
      type: "website",
      siteName: "Sightline",
      images: [
        {
          url: `/api/og?title=${t("ogImage", {
            playerName,
          })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

// Static shell: params (used by the header, nav links, and heading) are
// request-time under PPR, so everything streams into ONE boundary whose
// fallback mirrors the loaded page frame and the overview tab's pending
// layout — a single stable skeleton the content replaces in place.
export default function PlayerDashboardPage(
  props: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]/player/[playerId]">
) {
  return (
    <DirectionalTransition>
      <div className="flex-col md:flex">
        <Suspense fallback={<PlayerDashboardSkeleton />}>
          <PlayerDashboardContent params={props.params} />
        </Suspense>
      </div>
    </DirectionalTransition>
  );
}

async function PlayerDashboardContent({
  params: paramsPromise,
}: {
  params: PagePropsWithLocale<"/[team]/scrim/[scrimId]/map/[mapId]/player/[playerId]">["params"];
}) {
  const params = await paramsPromise;
  const id = parseInt(params.mapId);
  // The route's access gate — the [scrimId] layout no longer gates the
  // subtree (a layout gate adds a chrome-less loading phase above every
  // child route).
  if (!(await isAuthedToViewMap(parseInt(params.scrimId), id))) {
    return <NoAuthCard />;
  }
  const t = await getTranslations("mapPage.player.dashboard");
  const mapDataId = await resolveMapDataId(id);
  const playerName = decodeURIComponent(params.playerId);

  const mostPlayedHeroes = await getCachedMostPlayedHeroes(id);

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

  return (
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
          <TabsTrigger value="telemetry">{t("telemetry")}</TabsTrigger>
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
        <TabsContent value="telemetry" className="space-y-4">
          <PlayerTelemetry id={id} playerName={playerName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const STAT_BLOCK_SLOTS = ["a", "b", "c", "d"] as const;
const HERO_STAT_SLOTS = ["a", "b", "c", "d", "e", "f"] as const;

// Mirrors the loaded frame (nav row, heading, meta line, tab list) and the
// overview tab's pending layout (stat panel + hero statistics). The top bar
// is NOT mirrored here: the map layout owns the header behind its own
// Suspense boundary.
function PlayerDashboardSkeleton() {
  const t = getStaticTranslations("mapPage.player.dashboard");

  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <Skeleton className="h-4 w-32" />
        <span className="text-muted-foreground/40" aria-hidden="true">
          |
        </span>
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Skeleton className="h-3 w-20" />
        <span className="text-muted-foreground/40" aria-hidden="true">
          ·
        </span>
        <Skeleton className="h-3 w-16" />
        <span className="text-muted-foreground/40" aria-hidden="true">
          ·
        </span>
        <Skeleton className="h-3 w-24" />
      </div>

      <Tabs defaultValue="overview" className="mt-6 space-y-4">
        <TabsList aria-label="Player sections">
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("analytics")}</TabsTrigger>
          <TabsTrigger value="charts">{t("charts")}</TabsTrigger>
          <TabsTrigger value="telemetry">{t("telemetry")}</TabsTrigger>
        </TabsList>
        <StatPanel>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {STAT_BLOCK_SLOTS.map((slot) => (
              <div key={slot} className="flex flex-col px-5 py-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-20" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
            ))}
          </div>
        </StatPanel>
      </Tabs>

      <div className="mt-6">
        <Skeleton className="h-6 w-40" />
        <div className="mt-3 flex flex-col gap-4 2xl:flex-row">
          <div className="2xl:flex-1">
            <StatPanel>
              <div className="flex flex-col lg:flex-row">
                <div className="border-border flex flex-col items-center justify-center gap-3 px-5 py-5 lg:w-[200px] lg:shrink-0 lg:border-r">
                  <Skeleton className="aspect-square w-full max-w-[160px] rounded-lg" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="grid flex-1 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-3">
                  {HERO_STAT_SLOTS.map((slot) => (
                    <div key={slot} className="flex flex-col px-5 py-4">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="mt-3 h-7 w-20" />
                      <Skeleton className="mt-2 h-3 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </StatPanel>
          </div>
          <div className="2xl:w-[480px] 2xl:shrink-0">
            <div className="ring-foreground/10 max-h-[29.5rem] overflow-hidden rounded-xl ring-1">
              <Skeleton className="h-[29.5rem] w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
