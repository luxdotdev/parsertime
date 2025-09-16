import {
  RangePicker,
  type Timeframe,
} from "@/components/stats/hero/range-picker";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import {
  getAllDeathsForHero,
  getAllKillsForHero,
  getAllStatsForHero,
} from "@/data/hero-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { translateHeroName } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PagePropsWithLocale } from "@/types/next";
import type { Kill, PlayerStat, Scrim } from "@prisma/client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata(
  props: PagePropsWithLocale<"/stats/hero/[heroName]">
): Promise<Metadata> {
  const params = await props.params;
  const heroName = decodeURIComponent(params.heroName);
  const hero = await translateHeroName(heroName);
  const t = await getTranslations("statsPage.heroMetadata");

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
      locale: params.locale,
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
  const user = await getUser(session?.user.email);

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

  const scrimIds = heroScrims.map((scrim) => scrim.scrimId);

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
    "one-week": oneWeekScrims,
    "two-weeks": twoWeeksScrims,
    "one-month": monthScrims,
    "three-months": threeMonthsScrims,
    "six-months": sixMonthsScrims,
    "one-year": yearScrims,
    "all-time": allScrims,
    custom: [],
  };

  const allScrimIds = allScrims.map((scrim) => scrim.id);

  let allHeroStats: PlayerStat[];
  let allHeroKills: Kill[];
  let allHeroDeaths: Kill[];

  try {
    [allHeroStats, allHeroKills, allHeroDeaths] = await Promise.all([
      getAllStatsForHero(allScrimIds, hero),
      getAllKillsForHero(allScrimIds, hero),
      getAllDeathsForHero(allScrimIds, hero),
    ]);
  } catch {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {t("header", { hero: translatedHeroName })}
          </h2>
        </div>

        <Card className="h-[70vh] border-none">
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-xl font-bold text-red-500">
              {t("heroFail", { hero: translatedHeroName })}
              <div className="text-center">
                <Link
                  href="/stats"
                  className="text-muted-foreground text-base font-normal"
                >
                  &larr; {t("back")}
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {t("header", { hero: translatedHeroName })}
        </h2>
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
