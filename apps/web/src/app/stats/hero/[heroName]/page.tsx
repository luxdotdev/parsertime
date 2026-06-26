import {
  RangePicker,
  type Timeframe,
} from "@/components/stats/hero/range-picker";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { HeroService } from "@/data/hero";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, getViewableScrimIds } from "@/lib/auth";
import { defaultLocale } from "@/i18n/config";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { toHero, translateHeroName } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PagePropsWithLocale } from "@/types/next";
import type { Kill, PlayerStat, Scrim } from "@/generated/prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

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

export default async function HeroStats(
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
      <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
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
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
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
    </div>
  );
}
