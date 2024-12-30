import { RangePicker, Timeframe } from "@/components/stats/player/range-picker";
import { Card } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import {
  getAllDeathsForPlayer,
  getAllKillsForPlayer,
  getAllMapWinratesForPlayer,
  getAllStatsForPlayer,
} from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { Kill, PlayerStat, Scrim } from "@prisma/client";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

type Props = { params: { playerName: string; locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations("statsPage.playerMetadata");
  const playerName = decodeURIComponent(params.playerName);
  const suffix = playerName.endsWith("s") ? "'" : "'s";

  return {
    title: t("title", { playerName, suffix }),
    description: t("description", { playerName, suffix }),
    openGraph: {
      title: t("ogTitle", { playerName, suffix }),
      description: t("ogDescription", { playerName }),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage", {
            playerName,
            suffix,
          })}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function PlayerStats({ params }: Props) {
  const t = await getTranslations("statsPage.playerStats");
  const name = decodeURIComponent(params.playerName);

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
  const playerScrims = await prisma.playerStat.findMany({
    where: { player_name: { equals: name, mode: "insensitive" } },
    select: { scrimId: true },
    distinct: ["scrimId"],
  });

  const scrimIds = playerScrims.map((scrim) => scrim.scrimId);

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
    [allPlayerStats, allPlayerKills, mapWinrates, allPlayerDeaths] =
      await Promise.all([
        getAllStatsForPlayer(permittedScrimIds, name),
        getAllKillsForPlayer(permittedScrimIds, name),
        getAllMapWinratesForPlayer(permittedScrimIds, name),
        getAllDeathsForPlayer(permittedScrimIds, name),
      ]);
  } catch (e) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {t("title", { name, suffix: name.endsWith("s") ? "'" : "'s" })}
          </h2>
        </div>

        <Card className="h-[70vh] border-none">
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-xl font-bold text-red-500">
              {t("statsFail", { name })}
              <div className="text-center">
                <Link
                  href="/stats"
                  className="text-base font-normal text-muted-foreground"
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
          {t("title", { name, suffix: name.endsWith("s") ? "'" : "'s" })}
        </h2>
      </div>

      <RangePicker
        permissions={permissions}
        data={data}
        stats={allPlayerStats}
        kills={allPlayerKills}
        mapWinrates={mapWinrates}
        deaths={allPlayerDeaths}
      />
    </div>
  );
}
