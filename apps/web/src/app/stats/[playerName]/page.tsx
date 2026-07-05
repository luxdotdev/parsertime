import { SectionHeader } from "@/components/section-header";
import { StatPanel } from "@/components/player/stat-panel";
import {
  RangePicker,
  type Timeframe,
} from "@/components/stats/player/range-picker";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrimService } from "@/data/scrim";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, getViewableScrimIds } from "@/lib/auth";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { defaultLocale } from "@/i18n/config";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import type { PagePropsWithLocale } from "@/types/next";
import type { Kill, PlayerStat, Scrim } from "@/generated/prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata(
  props: PagePropsWithLocale<"/stats/[playerName]">
): Promise<Metadata> {
  const params = await props.params;
  const t = getMetadataTranslations("statsPage.playerMetadata");
  const playerName = decodeURIComponent(params.playerName);
  const suffix = playerName.endsWith("s") ? "'" : "'s";

  return {
    title: t("title", { playerName, suffix }),
    description: t("description", { playerName, suffix }),
    openGraph: {
      title: t("ogTitle", { playerName, suffix }),
      description: t("ogDescription", { playerName }),
      url: "/",
      type: "website",
      siteName: "Sightline",
      images: [
        {
          url: `/api/og?title=${t("ogImage", {
            playerName,
            suffix,
          })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

// Static shell: the page frame prerenders and the request-derived content
// (params, auth, permissions, DB reads) streams into ONE boundary whose
// fallback mirrors the profile's own pending layout. The player-name heading
// is request-time (it comes from params), so it lives in the content child.
export default function PlayerStats(
  props: PagePropsWithLocale<"/stats/[playerName]">
) {
  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <Suspense fallback={<PlayerStatsSkeleton />}>
        <PlayerStatsContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function PlayerStatsContent({
  params: paramsPromise,
}: {
  params: Promise<{ playerName: string }>;
}) {
  const params = await paramsPromise;
  const t = await getTranslations("statsPage.playerStats");
  const name = decodeURIComponent(params.playerName);

  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user.email)))
  );

  const [timeframe1, timeframe2, timeframe3] = await Promise.all([
    new Permission("stats-timeframe-1").check(),
    new Permission("stats-timeframe-2").check(),
    new Permission("stats-timeframe-3").check(),
  ]);

  const permissions = {
    "stats-timeframe-1": timeframe1,
    "stats-timeframe-2": timeframe2,
    "stats-timeframe-3": timeframe3,
  };

  if (!user) notFound();

  // get all time scrims
  const playerScrims = await prisma.playerStat.findMany({
    where: { player_name: { equals: name, mode: "insensitive" } },
    select: { scrimId: true },
    distinct: ["scrimId"],
  });

  const scrimIds = await getViewableScrimIds(
    playerScrims.map((scrim) => scrim.scrimId),
    user
  );

  const allScrims = await prisma.scrim.findMany({
    where: { id: { in: scrimIds } },
  });

  // last week
  const week = new Date();
  week.setDate(week.getDate() - 7);
  const oneWeekScrims = allScrims.filter((scrim) => scrim.date >= week);

  // last two weeks
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() - 14);
  const twoWeeksScrims = allScrims.filter((scrim) => scrim.date >= twoWeeks);

  // last month
  const month = new Date();
  month.setMonth(month.getMonth() - 1);
  const monthScrims = allScrims.filter((scrim) => scrim.date >= month);

  // last three months
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() - 3);
  const threeMonthsScrims = allScrims.filter(
    (scrim) => scrim.date >= threeMonths
  );

  // last six months
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() - 6);
  const sixMonthsScrims = allScrims.filter((scrim) => scrim.date >= sixMonths);

  // last year
  const year = new Date();
  year.setFullYear(year.getFullYear() - 1);
  const yearScrims = allScrims.filter((scrim) => scrim.date >= year);

  const data: Record<Timeframe, Scrim[]> = {
    "one-week": timeframe1 ? oneWeekScrims : [],
    "two-weeks": timeframe1 ? twoWeeksScrims : [],
    "one-month": timeframe1 ? monthScrims : [],
    "three-months": timeframe2 ? threeMonthsScrims : [],
    "six-months": timeframe2 ? sixMonthsScrims : [],
    "one-year": timeframe3 ? yearScrims : [],
    "all-time": timeframe3 ? allScrims : [],
    custom: [],
  };

  const permitted = timeframe3
    ? "all-time"
    : timeframe2
      ? "six-months"
      : "one-month";

  const permittedScrimIds = data[permitted].map((scrim) => scrim.id);

  let allPlayerStats: PlayerStat[];
  let allPlayerKills: Kill[];
  let mapWinrates: { map: string; wins: number; date: Date }[];
  let allPlayerDeaths: Kill[];

  try {
    const result = await AppRuntime.runPromise(
      Effect.all(
        {
          allPlayerStats: ScrimService.pipe(
            Effect.flatMap((svc) =>
              svc.getAllStatsForPlayer(permittedScrimIds, name)
            )
          ),
          allPlayerKills: ScrimService.pipe(
            Effect.flatMap((svc) =>
              svc.getAllKillsForPlayer(permittedScrimIds, name)
            )
          ),
          mapWinrates: ScrimService.pipe(
            Effect.flatMap((svc) =>
              svc.getAllMapWinratesForPlayer(permittedScrimIds, name)
            )
          ),
          allPlayerDeaths: ScrimService.pipe(
            Effect.flatMap((svc) =>
              svc.getAllDeathsForPlayer(permittedScrimIds, name)
            )
          ),
        },
        { concurrency: "unbounded" }
      )
    );
    allPlayerStats = result.allPlayerStats;
    allPlayerKills = result.allPlayerKills;
    mapWinrates = result.mapWinrates;
    allPlayerDeaths = result.allPlayerDeaths;
  } catch {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("title", { name, suffix: name.endsWith("s") ? "'" : "'s" })}
          </p>
        </div>

        <Card className="h-[60vh] border-none">
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-destructive text-base font-semibold">
              {t("statsFail", { name })}
            </p>
            <Link
              href="/stats"
              className="text-muted-foreground text-sm font-normal"
            >
              &larr; {t("back")}
            </Link>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
      </div>

      <RangePicker
        playerName={name}
        permissions={permissions}
        data={data}
        stats={allPlayerStats}
        kills={allPlayerKills}
        mapWinrates={mapWinrates}
        deaths={allPlayerDeaths}
      />
    </>
  );
}

// Mirrors the loaded layout: heading block, RangePicker toolbar row, then the
// PlayerProfile sections (SectionHeader + StatPanel shapes) so the streamed
// content replaces this in place with no jump.
function PlayerStatsSkeleton() {
  const t = getStaticTranslations("statsPage.playerStats");

  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-8 w-[200px]" />
      </div>

      <main className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-[180px] rounded-md" />
          <Skeleton className="h-9 w-[280px] rounded-md" />
        </div>

        <div className="min-h-[60vh] space-y-10">
          <section>
            <SectionHeader
              id="skeleton-overview"
              title={t("sections.overview")}
            />
            <StatPanel>
              <div className="grid grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex min-w-0 flex-col px-5 py-4">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="mt-3.5 h-7 w-20" />
                  </div>
                ))}
              </div>
            </StatPanel>
          </section>

          <section>
            <SectionHeader
              id="skeleton-heroes"
              title={t("heroPortfolio.title")}
              description={t("heroPortfolio.description")}
            />
            <StatPanel>
              <div className="px-5 py-5">
                <Skeleton className="h-40" />
              </div>
            </StatPanel>
          </section>

          <section>
            <SectionHeader id="skeleton-form" title={t("sections.form")} />
            <StatPanel>
              <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
                <ChartCellSkeleton title={t("avgHeroDmgDealtPer10.title")} />
                <ChartCellSkeleton title={t("avgDeathPer10.title")} />
              </div>
            </StatPanel>
            <div className="mt-3">
              <StatPanel>
                <ChartCellSkeleton title={t("stats.title")} />
              </StatPanel>
            </div>
          </section>

          <section>
            <SectionHeader id="skeleton-maps" title={t("sections.maps")} />
            <StatPanel>
              <ChartCellSkeleton title={t("mapWinrates.title")} />
            </StatPanel>
            <div className="mt-3">
              <StatPanel>
                <ChartCellSkeleton title={t("winrateMapType.title")} />
              </StatPanel>
            </div>
          </section>

          <section>
            <SectionHeader id="skeleton-habits" title={t("sections.habits")} />
            <StatPanel>
              <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
                <ChartCellSkeleton title={t("timeSpent.title")} />
                <ChartCellSkeleton title={t("finalBlowsByMethod.title")} />
              </div>
            </StatPanel>
          </section>

          <section>
            <SectionHeader id="skeleton-combat" title={t("sections.combat")} />
            <StatPanel>
              <div className="bg-border grid grid-cols-1 gap-px md:grid-cols-3">
                <ChartCellSkeleton title={t("bestPerformance.title")} />
                <ChartCellSkeleton title={t("heroesElimMost.title")} />
                <ChartCellSkeleton title={t("heroesDiedToMost.title")} />
              </div>
            </StatPanel>
          </section>
        </div>
      </main>
    </>
  );
}

function ChartCellSkeleton({ title }: { title: string }) {
  return (
    <div className="bg-card flex flex-col px-5 py-5">
      <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {title}
      </h3>
      <div className="mt-5">
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
