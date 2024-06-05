import { RangePicker, Timeframe } from "@/components/stats/player/range-picker";
import { getAllStatsForPlayer } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Scrim } from "@prisma/client";
import { notFound } from "next/navigation";

type Props = {
  params: { playerName: string };
};

export default async function PlayerStats({ params }: Props) {
  const name = decodeURIComponent(params.playerName);

  const session = await auth();
  const user = await getUser(session?.user.email);

  if (!user) {
    notFound();
  }

  // get all time scrims
  const playerScrims = await prisma.playerStat.findMany({
    where: {
      player_name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: {
      scrimId: true,
    },
    distinct: ["scrimId"],
  });

  const scrimIds = playerScrims.map((scrim) => scrim.scrimId);

  const allScrims = await prisma.scrim.findMany({
    where: {
      id: {
        in: scrimIds,
      },
    },
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

  const allPlayerStats = await getAllStatsForPlayer(allScrimIds, name);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {name}&apos;{name.endsWith("s") ? "" : "s"} Stats
        </h2>
      </div>

      <RangePicker user={user} data={data} name={name} stats={allPlayerStats} />
    </div>
  );
}
