import { PlayerCharts } from "@/components/charts/player/player-charts";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PlayerSwitcher } from "@/components/map/player-switcher";
import { PlayerAnalytics } from "@/components/player/analytics";
import { DefaultOverview } from "@/components/player/default-overview";
import { PlayerTelemetry } from "@/components/player/player-telemetry";
import { StatPanel } from "@/components/player/stat-panel";
import { ModeToggle } from "@/components/theme-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { PlayerService } from "@/data/player";
import { defaultLocale } from "@/i18n/config";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import prisma from "@/lib/prisma";
import { toTitleCase } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

function decodePlayerId(playerId: string) {
  try {
    return decodeURIComponent(playerId);
  } catch {
    return null;
  }
}

export async function generateMetadata(
  props: PagePropsWithLocale<"/demo/player/[playerId]">
): Promise<Metadata> {
  const params = await props.params;
  const t = getMetadataTranslations("mapPage.playerMetadata");
  const playerName = decodePlayerId(params.playerId) ?? "Player";

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
      locale: defaultLocale,
    },
  };
}

// Static shell: params (used by the switcher, heading, and tabs) are
// request-time under PPR, so everything streams into ONE boundary whose
// fallback mirrors the loaded page frame and the overview tab's pending
// layout — a single stable skeleton the content replaces in place.
export default function PlayerDashboardDemoPage(
  props: PagePropsWithLocale<"/demo/player/[playerId]">
) {
  return (
    <div className="flex-col md:flex">
      <Suspense fallback={<PlayerDashboardDemoSkeleton />}>
        <PlayerDashboardDemoContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function PlayerDashboardDemoContent({
  params: paramsPromise,
}: {
  params: PagePropsWithLocale<"/demo/player/[playerId]">["params"];
}) {
  const params = await paramsPromise;
  const t = await getTranslations("mapPage.player.dashboard");
  const id = 10148;
  const mapDataId = await resolveMapDataId(id);
  const playerName = decodePlayerId(params.playerId);

  if (!playerName) {
    notFound();
  }

  const mostPlayedHeroes = await AppRuntime.runPromise(
    PlayerService.pipe(Effect.flatMap((svc) => svc.getMostPlayedHeroes(id)))
  );
  const playerExists = mostPlayedHeroes.some(
    (player) => player.player_name === playerName
  );

  if (!playerExists) {
    notFound();
  }

  const mapName = await prisma.matchStart.findFirst({
    where: {
      MapDataId: mapDataId,
    },
    select: {
      map_name: true,
    },
  });

  return (
    <>
      <div className="border-b">
        <div className="hidden h-16 items-center px-4 md:flex">
          <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
          <MainNav className="mx-6" scoutingEnabled={false} />
          <div className="ml-auto flex items-center space-x-4">
            <Search user={null} />
            <ModeToggle />
            <LocaleSwitcher />
          </div>
        </div>
        <div className="flex h-16 items-center px-4 md:hidden">
          <PlayerSwitcher mostPlayedHeroes={mostPlayedHeroes} />
          <div className="ml-auto flex items-center space-x-4">
            <ModeToggle />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h4 className="text-gray-600 dark:text-gray-400">
            <Link href="/demo">&larr; {t("back")}</Link>
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
    </>
  );
}

const STAT_BLOCK_SLOTS = ["a", "b", "c", "d"] as const;
const HERO_STAT_SLOTS = ["a", "b", "c", "d", "e", "f"] as const;

// Mirrors the loaded frame (demo header, back link, heading, tab list) and
// the overview tab's pending layout (stat panel + hero statistics).
function PlayerDashboardDemoSkeleton() {
  const t = getStaticTranslations("mapPage.player.dashboard");

  return (
    <>
      <div className="border-b">
        <div className="hidden h-16 items-center px-4 md:flex">
          <Skeleton className="h-6 w-24" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="border-input hidden h-9 w-full rounded-md border px-3 py-1 md:flex md:w-[100px] lg:w-[300px]" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex h-16 items-center px-4 md:hidden">
          <Skeleton className="h-6 w-24" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h4 className="text-gray-600 dark:text-gray-400">
            <Skeleton className="h-6 w-32" />
          </h4>
        </div>
        <div className="flex items-center justify-between space-y-2">
          <Skeleton className="h-9 w-64" />
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
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
          <div className="pt-2">
            <Skeleton className="h-3 w-32" />
            <div className="mt-5 flex flex-col gap-4 2xl:flex-row">
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
        </Tabs>
      </div>
    </>
  );
}
