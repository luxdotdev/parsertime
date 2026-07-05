import { StatPanel } from "@/components/player/stat-panel";
import { SectionHeader } from "@/components/section-header";
import {
  RangePicker,
  type Timeframe,
} from "@/components/stats/hero/range-picker";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroService } from "@/data/hero";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, getViewableScrimIds } from "@/lib/auth";
import { defaultLocale } from "@/i18n/config";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { toHero, translateHeroName } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PagePropsWithLocale } from "@/types/next";
import type { Kill, PlayerStat, Scrim } from "@/generated/prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata(
  props: PagePropsWithLocale<"/stats/hero/[heroName]">
): Promise<Metadata> {
  const params = await props.params;
  const heroName = decodeURIComponent(params.heroName);
  const hero = getMetadataTranslations("heroes")(toHero(heroName));
  const t = getMetadataTranslations("statsPage.heroMetadata");

  return {
    title: t("title", { hero }),
    description: t("description", { hero }),
    openGraph: {
      title: t("ogTitle", { hero }),
      description: t("ogDescription", { hero }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", { hero })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

// Static shell: the page frame prerenders, and all request-time work (params,
// auth, DB reads) streams into ONE boundary whose fallback mirrors the loaded
// hero profile's pending layout.
export default function HeroStats(
  props: PagePropsWithLocale<"/stats/hero/[heroName]">
) {
  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <Suspense fallback={<HeroStatsSkeleton />}>
        <HeroStatsContent {...props} />
      </Suspense>
    </div>
  );
}

async function HeroStatsContent(
  props: PagePropsWithLocale<"/stats/hero/[heroName]">
) {
  const params = await props.params;
  const t = await getTranslations("statsPage.heroStats");

  const hero = decodeURIComponent(params.heroName);
  const translatedHeroName = await translateHeroName(hero);

  // check if hero is valid
  if (heroRoleMapping[hero as HeroName] === undefined) notFound();

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
  const heroScrims = await prisma.playerStat.findMany({
    where: { player_hero: { equals: hero, mode: "insensitive" } },
    select: { scrimId: true },
    distinct: ["scrimId"],
  });

  const scrimIds = await getViewableScrimIds(
    heroScrims.map((scrim) => scrim.scrimId),
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

  let allHeroStats: PlayerStat[];
  let allHeroKills: Kill[];
  let allHeroDeaths: Kill[];

  try {
    [allHeroStats, allHeroKills, allHeroDeaths] = await AppRuntime.runPromise(
      Effect.all(
        [
          HeroService.pipe(
            Effect.flatMap((svc) =>
              svc.getAllStatsForHero(permittedScrimIds, hero)
            )
          ),
          HeroService.pipe(
            Effect.flatMap((svc) =>
              svc.getAllKillsForHero(permittedScrimIds, hero)
            )
          ),
          HeroService.pipe(
            Effect.flatMap((svc) =>
              svc.getAllDeathsForHero(permittedScrimIds, hero)
            )
          ),
        ],
        { concurrency: "unbounded" }
      )
    );
  } catch {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {translatedHeroName}
          </h1>
        </div>

        <Card className="h-[60vh] border-none">
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-destructive text-base font-semibold">
              {t("heroFail", { hero: translatedHeroName })}
            </p>
            <Link
              href="/stats/hero"
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
        <h1 className="text-2xl font-bold tracking-tight">
          {translatedHeroName}
        </h1>
      </div>

      <RangePicker
        permissions={permissions}
        data={data}
        stats={allHeroStats}
        kills={allHeroKills}
        deaths={allHeroDeaths}
        hero={hero as HeroName}
      />
    </>
  );
}

// Mirrors the loaded state: heading, RangePicker's timeframe select, and the
// HeroProfile section stack (SectionHeader + StatPanel, 250px chart cells) so
// the streamed content replaces this in place.
function HeroStatsSkeleton() {
  const t = getStaticTranslations("statsPage.heroStats");

  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-8 w-[220px]" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-[180px]" />
        </div>

        <div className="min-h-[60vh] space-y-10">
          <section aria-labelledby="hero-overview">
            <header className="mb-5 flex flex-col gap-1">
              <h2
                id="hero-overview"
                className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
              >
                {t("sections.overview")}
              </h2>
              <Skeleton className="h-4 w-56" />
            </header>
            <StatPanel>
              <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-[auto_1fr]">
                <div className="bg-card flex items-center gap-4 px-5 py-4">
                  <Skeleton className="size-16 rounded-md" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="bg-card grid grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex min-w-0 flex-col px-5 py-4">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="mt-3.5 h-7 w-14" />
                    </div>
                  ))}
                </div>
              </div>
            </StatPanel>
          </section>

          <section aria-labelledby="hero-talent">
            <SectionHeader
              id="hero-talent"
              title={t("sections.talent")}
              description={t("talent.description")}
            />
            <StatPanel>
              <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-[1.4fr_1fr]">
                <ChartCellSkeleton />
                <ChartCellSkeleton />
              </div>
            </StatPanel>
          </section>

          <section aria-labelledby="hero-form">
            <SectionHeader id="hero-form" title={t("sections.form")} />
            <StatPanel>
              <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
                <ChartCellSkeleton />
                <ChartCellSkeleton />
              </div>
            </StatPanel>
            <div className="mt-3">
              <StatPanel>
                <ChartCellSkeleton />
              </StatPanel>
            </div>
          </section>

          <section aria-labelledby="hero-combat">
            <SectionHeader id="hero-combat" title={t("sections.combat")} />
            <StatPanel>
              <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
                <ChartCellSkeleton />
                <ChartCellSkeleton />
              </div>
            </StatPanel>
            <div className="mt-3">
              <StatPanel>
                <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
                  <ChartCellSkeleton />
                  <ChartCellSkeleton />
                </div>
              </StatPanel>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function ChartCellSkeleton() {
  return (
    <div className="bg-card flex flex-col px-5 py-5">
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="mt-5 h-[250px]" />
    </div>
  );
}
