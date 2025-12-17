import { HeroMasteryGrid } from "@/components/profile/hero-mastery-grid";
import { HeroRating } from "@/components/profile/hero-rating";
import { PersonalRecords } from "@/components/profile/personal-records";
import { PlayStyleIndicator } from "@/components/profile/play-style-indicator";
import { ProfileHeader } from "@/components/profile/profile-header";
import { StatFluctuationCards } from "@/components/profile/stat-fluctuation-cards";
import { Statistics } from "@/components/stats/player/statistics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAllDeathsForPlayer,
  getAllKillsForPlayer,
  getAllMapWinratesForPlayer,
  getAllStatsForPlayer,
} from "@/data/scrim-dto";
import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import prisma from "@/lib/prisma";
import { toHero, toTimestampWithHours } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PagePropsWithLocale } from "@/types/next";
import type { Scrim } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

// Helper type for hero data
type HeroData = {
  player_hero: string;
  total_time_played: number;
  hero_rating: number;
  mapsPlayed: number;
  percentile: string;
  rank: number;
};

export default async function ProfilePage(
  props: PagePropsWithLocale<"/profile/[playerName]">
) {
  const params = await props.params;
  const name = decodeURIComponent(params.playerName);
  const t = await getTranslations("heroes");

  // Attempt to fetch user data
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { battletag: { equals: name, mode: "insensitive" } },
      ],
    },
  });

  const playerData = {
    name: user?.name ?? name,
    image: user?.image ?? null,
    title: user?.role === "ADMIN" ? "Administrator" : "Player", // Mock title logic
  };

  // 1. Fetch all heroes played by the user, sorted by time played
  // We use raw query for speed and aggregation
  type HeroPlayTime = {
    player_hero: string;
    total_time_played: number;
  };

  const heroesPlayed = await prisma.$queryRaw<HeroPlayTime[]>`
    WITH final_rows AS (
      SELECT DISTINCT ON ("MapDataId", player_name, player_hero)
        player_hero,
        hero_time_played
      FROM
        "PlayerStat"
      WHERE
        player_name ILIKE ${name}
        AND hero_time_played > 0
      ORDER BY
        "MapDataId",
        player_name,
        player_hero,
        round_number DESC,
        id DESC
    )
    SELECT
      player_hero,
      SUM(hero_time_played) AS total_time_played
    FROM
      final_rows
    GROUP BY
      player_hero
    ORDER BY
      total_time_played DESC
  `;

  // 2. Fetch SR for top 10 heroes to avoid too many DB calls
  // For others we will just show play time
  const topHeroesToRate = heroesPlayed.slice(0, 10);

  const heroRatings = await Promise.all(
    topHeroesToRate.map(async (hero) => {
      const compositeLeaderboard = await getCompositeSRLeaderboard({
        hero: hero.player_hero as HeroName,
        player: name,
        limit: 300,
      });

      if (!compositeLeaderboard) {
        const mapsPlayed = await prisma.playerStat.groupBy({
          by: ["MapDataId"],
          where: {
            player_name: { equals: name, mode: "insensitive" },
            player_hero: hero.player_hero as HeroName,
            hero_time_played: { gt: 60 },
          },
        });

        return {
          ...hero,
          hero_rating: 0,
          mapsPlayed: mapsPlayed.length,
          percentile: "0",
          rank: 0,
        } as unknown as HeroData;
      }

      return {
        ...hero,
        hero_rating: compositeLeaderboard.composite_sr ?? 0,
        mapsPlayed: compositeLeaderboard.maps ?? 0,
        percentile: compositeLeaderboard.percentile ?? "0",
        rank: compositeLeaderboard.rank ?? 0,
      } as unknown as HeroData;
    })
  );

  // Merge back into full list
  const allHeroesData: HeroData[] = heroesPlayed.map((hero) => {
    const ratedHero = heroRatings.find(
      (h) => h.player_hero === hero.player_hero
    );
    if (ratedHero) return ratedHero;
    return {
      ...hero,
      hero_rating: 0,
      mapsPlayed: 0, // We didn't fetch this for non-top heroes to save time
      percentile: "0",
      rank: 0,
    };
  });

  const top3Heroes = allHeroesData.slice(0, 3);

  // Calculate Role Data
  const roleData: Record<
    "Tank" | "Damage" | "Support",
    { time: number; sr: number }
  > = {
    Tank: { time: 0, sr: 0 },
    Damage: { time: 0, sr: 0 },
    Support: { time: 0, sr: 0 },
  };

  allHeroesData.forEach((hero) => {
    const role = heroRoleMapping[hero.player_hero as HeroName];
    if (role) {
      roleData[role].time += hero.total_time_played;
      if (hero.hero_rating > 0) {
        // Use max hero SR as the "Role SR" for now, as it represents peak performance
        roleData[role].sr = Math.max(roleData[role].sr, hero.hero_rating);
      }
    }
  });

  const calculatedStats = await prisma.calculatedStat.findMany({
    where: { playerName: { equals: name, mode: "insensitive" } },
  });

  const playerScrims = await prisma.playerStat.findMany({
    where: { player_name: { equals: name, mode: "insensitive" } },
    select: { scrimId: true },
    distinct: ["scrimId"],
  });

  const scrimIds = playerScrims.map((scrim) => scrim.scrimId);

  const allScrims = await prisma.scrim.findMany({
    where: { id: { in: scrimIds } },
  });

  const oneWeek = new Date();
  oneWeek.setDate(oneWeek.getDate() - 7);
  const oneWeekScrims = allScrims.filter((scrim) => scrim.date >= oneWeek);

  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() - 14);
  const twoWeeksScrims = allScrims.filter((scrim) => scrim.date >= twoWeeks);

  const oneMonth = new Date();
  oneMonth.setMonth(oneMonth.getMonth() - 1);
  const monthScrims = allScrims.filter((scrim) => scrim.date >= oneMonth);

  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() - 3);
  const threeMonthsScrims = allScrims.filter(
    (scrim) => scrim.date >= threeMonths
  );

  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() - 6);
  const sixMonthsScrims = allScrims.filter((scrim) => scrim.date >= sixMonths);

  const year = new Date();
  year.setFullYear(year.getFullYear() - 1);
  const yearScrims = allScrims.filter((scrim) => scrim.date >= year);

  const scrims: Record<string, Scrim[]> = {
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

  const [stats, kills, deaths, mapWinrates] = await Promise.all([
    getAllStatsForPlayer(allScrimIds, name),
    getAllKillsForPlayer(allScrimIds, name),
    getAllDeathsForPlayer(allScrimIds, name),
    getAllMapWinratesForPlayer(allScrimIds, name),
  ]);

  // Calculate max time for bar chart scaling
  const maxTimePlayed = Math.max(
    ...allHeroesData.map((h) => h.total_time_played)
  );

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <ProfileHeader player={playerData} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progression">Progression</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="history" disabled>
            History
          </TabsTrigger>
          <TabsTrigger value="achievements" disabled>
            Achievements
          </TabsTrigger>
          <TabsTrigger value="customization" disabled>
            Customization
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Left Column: Most Played Heroes */}
            <div className="col-span-4 space-y-4 lg:col-span-4">
              <div className="bg-card text-card-foreground rounded-xl border shadow">
                <div className="p-6">
                  <h3 className="mb-4 leading-none font-semibold tracking-tight">
                    Most Played Heroes
                  </h3>
                  <div className="flex items-center justify-around py-4">
                    {top3Heroes.map((hero, index) => (
                      <div
                        key={hero.player_hero}
                        className="flex flex-col items-center gap-2"
                      >
                        <div
                          className={`bg-muted relative overflow-hidden rounded-full border-4 ${
                            index === 0
                              ? "h-28 w-28 scale-110 border-blue-500 shadow-lg"
                              : index === 1
                                ? "h-24 w-24 border-orange-600"
                                : "h-24 w-24 border-blue-400"
                          }`}
                        >
                          <Image
                            src={`/heroes/${toHero(hero.player_hero)}.png`}
                            alt={hero.player_hero}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center">
                          <HeroRating
                            heroRating={hero.hero_rating}
                            mapsPlayed={hero.mapsPlayed}
                            rank={hero.rank}
                          />
                          <div className="text-muted-foreground text-sm font-semibold uppercase">
                            {t(toHero(hero.player_hero))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {top3Heroes.length === 0 && (
                      <div className="text-muted-foreground text-sm">
                        No data available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="all-time">
                <TabsList>
                  <TabsTrigger value="all-time">All Time</TabsTrigger>
                  <TabsTrigger value="one-week">One Week</TabsTrigger>
                  <TabsTrigger value="two-weeks">Two Weeks</TabsTrigger>
                  <TabsTrigger value="one-month">One Month</TabsTrigger>
                  <TabsTrigger value="three-months">Three Months</TabsTrigger>
                  <TabsTrigger value="six-months">Six Months</TabsTrigger>
                  <TabsTrigger value="one-year">One Year</TabsTrigger>
                </TabsList>
                <TabsContent value="all-time">
                  <StatFluctuationCards
                    calculatedStats={calculatedStats}
                    timeframe="all-time"
                  />
                </TabsContent>
                <TabsContent value="one-week">
                  <StatFluctuationCards
                    calculatedStats={calculatedStats}
                    timeframe="one-week"
                  />
                </TabsContent>
                <TabsContent value="two-weeks">
                  <StatFluctuationCards
                    calculatedStats={calculatedStats}
                    timeframe="two-weeks"
                  />
                </TabsContent>
                <TabsContent value="one-month">
                  <StatFluctuationCards
                    calculatedStats={calculatedStats}
                    timeframe="one-month"
                  />
                </TabsContent>
                <TabsContent value="three-months">
                  <StatFluctuationCards
                    calculatedStats={calculatedStats}
                    timeframe="three-months"
                  />
                </TabsContent>
                <TabsContent value="six-months">
                  <StatFluctuationCards
                    calculatedStats={calculatedStats}
                    timeframe="six-months"
                  />
                </TabsContent>
                <TabsContent value="one-year">
                  <StatFluctuationCards
                    calculatedStats={calculatedStats}
                    timeframe="one-year"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column: Comparison / Role Stats */}
            <div className="col-span-3 space-y-4 lg:col-span-3">
              <div className="bg-card text-card-foreground h-full rounded-xl border p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="leading-none font-semibold tracking-tight">
                    Hero Comparison
                  </h3>
                  <span className="text-muted-foreground text-sm">
                    Time Played
                  </span>
                </div>
                {/* Comparison Bars */}
                <div className="space-y-3">
                  {allHeroesData.slice(0, 5).map((hero) => (
                    <div key={hero.player_hero} className="space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="flex min-w-[120px] flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            {t(toHero(hero.player_hero))}
                          </span>
                          {hero.hero_rating > 0 ? (
                            <HeroRating
                              heroRating={hero.hero_rating}
                              mapsPlayed={hero.mapsPlayed}
                              rank={hero.rank}
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Unplaced
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 items-center gap-2">
                          <div className="bg-muted h-4 flex-1 overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full"
                              style={{
                                width: `${(hero.total_time_played / maxTimePlayed) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-muted-foreground min-w-[80px] text-right text-sm">
                            {toTimestampWithHours(hero.total_time_played)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {allHeroesData.length === 0 && (
                    <div className="text-muted-foreground text-sm">
                      No data available
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <div className="text-muted-foreground mb-2 grid grid-cols-3 gap-2 px-2 text-xs font-semibold">
                    <div className="uppercase">Role</div>
                    <div className="text-right uppercase">Time Played</div>
                    <div className="text-right uppercase">Peak SR</div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-muted/50 grid grid-cols-3 items-center gap-2 rounded p-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-blue-500" />
                        <span>Tank</span>
                      </div>
                      <div className="text-right">
                        {roleData.Tank.time > 0
                          ? toTimestampWithHours(roleData.Tank.time)
                          : "-"}
                      </div>
                      <div className="flex justify-end">
                        {roleData.Tank.sr > 0 ? (
                          <HeroRating
                            heroRating={roleData.Tank.sr}
                            mapsPlayed={10}
                            rank={0}
                          />
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div className="bg-muted/50 grid grid-cols-3 items-center gap-2 rounded p-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-red-500" />
                        <span>Damage</span>
                      </div>
                      <div className="text-right">
                        {roleData.Damage.time > 0
                          ? toTimestampWithHours(roleData.Damage.time)
                          : "-"}
                      </div>
                      <div className="flex justify-end">
                        {roleData.Damage.sr > 0 ? (
                          <HeroRating
                            heroRating={roleData.Damage.sr}
                            mapsPlayed={10}
                            rank={0}
                          />
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div className="bg-muted/50 grid grid-cols-3 items-center gap-2 rounded p-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-green-500" />
                        <span>Support</span>
                      </div>
                      <div className="text-right">
                        {roleData.Support.time > 0
                          ? toTimestampWithHours(roleData.Support.time)
                          : "-"}
                      </div>
                      <div className="flex justify-end">
                        {roleData.Support.sr > 0 ? (
                          <HeroRating
                            heroRating={roleData.Support.sr}
                            mapsPlayed={10}
                            rank={0}
                          />
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <HeroMasteryGrid heroesData={allHeroesData} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="progression" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Left Column: Play Style Indicator */}
            <div className="col-span-4 space-y-4 lg:col-span-4">
              <PlayStyleIndicator calculatedStats={calculatedStats} />
            </div>

            {/* Right Column: Personal Records */}
            <div className="col-span-3 space-y-4 lg:col-span-3">
              <PersonalRecords stats={stats} heroesData={allHeroesData} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="statistics" className="space-y-4">
          <Statistics
            timeframe="all-time"
            date={undefined}
            scrims={scrims}
            stats={stats}
            hero="all"
            kills={kills}
            mapWinrates={mapWinrates}
            deaths={deaths}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
