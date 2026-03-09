import { RecentActivityCalendar } from "@/components/profile/recent-activity-calendar";
import { BestRoleTriosCard } from "@/components/stats/team/best-role-trios-card";
import { HeroBanImpactCard } from "@/components/stats/team/hero-ban-impact-card";
import { HeroPoolContainer } from "@/components/stats/team/hero-pool-container";
import { MapModePerformanceCard } from "@/components/stats/team/map-mode-performance-card";
import { MapWinrateGallery } from "@/components/stats/team/map-winrate-gallery";
import { PlayerMapPerformanceCard } from "@/components/stats/team/player-map-performance-card";
import { QuickStatsCard } from "@/components/stats/team/quick-stats-card";
import { RecentFormCard } from "@/components/stats/team/recent-form-card";
import { RoleBalanceRadar } from "@/components/stats/team/role-balance-radar";
import { RolePerformanceCard } from "@/components/stats/team/role-performance-card";
import { StrengthsWeaknessesCard } from "@/components/stats/team/strengths-weaknesses-card";
import { SwapOverviewCard } from "@/components/stats/team/swap-overview-card";
import { SwapPairsCard } from "@/components/stats/team/swap-pairs-card";
import { SwapPlayerBreakdownCard } from "@/components/stats/team/swap-player-breakdown-card";
import { SwapTimingCard } from "@/components/stats/team/swap-timing-card";
import { SwapWinrateImpactCard } from "@/components/stats/team/swap-winrate-impact-card";
import { TeamFightStatsCard } from "@/components/stats/team/team-fight-stats-card";
import { TeamRangePicker } from "@/components/stats/team/team-range-picker";
import { TeamRosterGrid } from "@/components/stats/team/team-roster-grid";
import { TopMapsCard } from "@/components/stats/team/top-maps-card";
import { UltPlayerRankingsCard } from "@/components/stats/team/ult-player-rankings-card";
import { UltRoleBreakdownCard } from "@/components/stats/team/ult-role-breakdown-card";
import { UltUsageOverviewCard } from "@/components/stats/team/ult-usage-overview-card";
import { UltimateEconomyCard } from "@/components/stats/team/ultimate-economy-card";
import { WinLossStreaksCard } from "@/components/stats/team/win-loss-streaks-card";
import { WinProbabilityInsights } from "@/components/stats/team/win-probability-insights";
import { WinrateOverTimeChart } from "@/components/stats/team/winrate-over-time-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getHeroPickrateRawData,
  getPlayerMapPerformanceMatrix,
} from "@/data/team-analytics-dto";
import { getTeamBanImpactAnalysis } from "@/data/team-ban-impact-dto";
import { getTeamFightStats } from "@/data/team-fight-stats-dto";
import { getHeroPoolAnalysis } from "@/data/team-hero-pool-dto";
import { getTeamHeroSwapStats } from "@/data/team-hero-swap-dto";
import { getMapModePerformance } from "@/data/team-map-mode-stats-dto";
import {
  getRecentForm,
  getStreakInfo,
  getWinrateOverTime,
} from "@/data/team-performance-trends-dto";
import { getQuickWinsStats } from "@/data/team-quick-wins-dto";
import {
  getBestRoleTrios,
  getRoleBalanceAnalysis,
  getRolePerformanceStats,
} from "@/data/team-role-stats-dto";
import type { TeamDateRange } from "@/data/team-shared-core";
import {
  getBestMapByWinrate,
  getBlindSpotMap,
  getTeamRoster,
  getTeamWinrates,
  getTop5MapsByPlaytime,
  getTopMapsByPlaytime,
} from "@/data/team-stats-dto";
import { getTeamUltStats } from "@/data/team-ult-stats-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { calculateHeroPickrateMatrix } from "@/lib/hero-pickrate-utils";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { isValidTimeframe, type Timeframe } from "@/lib/timeframe";
import { getMapNames } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import { addMonths, addWeeks, addYears } from "date-fns";
import Image from "next/image";
import { notFound } from "next/navigation";

function computeDateRange(
  timeframe: Timeframe,
  customFrom?: string,
  customTo?: string
): TeamDateRange | undefined {
  const now = new Date();

  switch (timeframe) {
    case "one-week":
      return { from: addWeeks(now, -1), to: now };
    case "two-weeks":
      return { from: addWeeks(now, -2), to: now };
    case "one-month":
      return { from: addMonths(now, -1), to: now };
    case "three-months":
      return { from: addMonths(now, -3), to: now };
    case "six-months":
      return { from: addMonths(now, -6), to: now };
    case "one-year":
      return { from: addYears(now, -1), to: now };
    case "all-time":
      return undefined;
    case "custom": {
      if (customFrom && customTo) {
        const from = new Date(customFrom);
        const to = new Date(customTo);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          return { from, to };
        }
      }
      return { from: addWeeks(now, -1), to: now };
    }
  }
}

function clampTimeframe(
  requested: Timeframe,
  permissions: Record<string, boolean>
): Timeframe {
  const tier3Only: Timeframe[] = ["one-year", "all-time", "custom"];
  const tier2Only: Timeframe[] = ["three-months", "six-months"];

  if (tier3Only.includes(requested) && !permissions["stats-timeframe-3"]) {
    return permissions["stats-timeframe-2"] ? "six-months" : "one-month";
  }
  if (tier2Only.includes(requested) && !permissions["stats-timeframe-2"]) {
    return "one-month";
  }
  return requested;
}

export default async function TeamStatsPage(
  props: PagePropsWithLocale<"/stats/team/[teamId]"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const session = await auth();
  const user = await getUser(session?.user.email);
  if (!user) notFound();

  const params = await props.params;
  const searchParams = await props.searchParams;
  const teamId = parseInt(params.teamId);

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    include: { users: true },
  });
  if (!team) notFound();

  const userIsMember = team.users.some((teamUser) => teamUser.id === user.id);
  if (!userIsMember && user.role !== $Enums.UserRole.ADMIN) notFound();

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

  const rawTimeframe =
    typeof searchParams.timeframe === "string" ? searchParams.timeframe : null;
  const requestedTimeframe: Timeframe = isValidTimeframe(rawTimeframe)
    ? rawTimeframe
    : "one-week";
  const effectiveTimeframe = clampTimeframe(requestedTimeframe, permissions);

  const customFrom =
    typeof searchParams.from === "string" ? searchParams.from : undefined;
  const customTo =
    typeof searchParams.to === "string" ? searchParams.to : undefined;

  const dateRange = computeDateRange(effectiveTimeframe, customFrom, customTo);

  const [
    scrims,
    teamRoster,
    winrates,
    top5Maps,
    allMapsPlaytime,
    bestMapByWinrate,
    blindSpotMap,
    fightStats,
    mapNames,
    roleStats,
    roleBalance,
    bestTrios,
    weeklyWinrate,
    monthlyWinrate,
    recentForm,
    streakInfo,
    mapModePerformance,
    quickStats,
    playerMapPerformance,
    ultStats,
    heroSwapStats,
    banImpactAnalysis,
  ] = await Promise.all([
    prisma.scrim.findMany({
      where: {
        teamId,
        ...(dateRange && { date: { gte: dateRange.from, lte: dateRange.to } }),
      },
    }),
    getTeamRoster(teamId),
    getTeamWinrates(teamId, dateRange),
    getTop5MapsByPlaytime(teamId, dateRange),
    getTopMapsByPlaytime(teamId, dateRange),
    getBestMapByWinrate(teamId, dateRange),
    getBlindSpotMap(teamId, dateRange),
    getTeamFightStats(teamId, dateRange),
    getMapNames(),
    getRolePerformanceStats(teamId, dateRange),
    getRoleBalanceAnalysis(teamId, dateRange),
    getBestRoleTrios(teamId, dateRange),
    getWinrateOverTime(teamId, "week", dateRange),
    getWinrateOverTime(teamId, "month", dateRange),
    getRecentForm(teamId, dateRange),
    getStreakInfo(teamId, dateRange),
    getMapModePerformance(teamId, dateRange),
    getQuickWinsStats(teamId, dateRange),
    getPlayerMapPerformanceMatrix(teamId, dateRange),
    getTeamUltStats(teamId, dateRange),
    getTeamHeroSwapStats(teamId, dateRange),
    getTeamBanImpactAnalysis(teamId, dateRange),
  ]);

  const heroPickrateRawData = await getHeroPickrateRawData(teamId, dateRange);
  const heroPool = await getHeroPoolAnalysis(
    teamId,
    dateRange?.from,
    dateRange?.to
  );
  const heroPickrateMatrix = calculateHeroPickrateMatrix(heroPickrateRawData);

  const mapPlaytimes: Record<string, number> = {};
  allMapsPlaytime.forEach((map) => {
    mapPlaytimes[map.name] = map.playtime;
  });

  const totalGames = winrates.overallWins + winrates.overallLosses;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src={team.image ?? `https://avatar.vercel.sh/${team.name}.png`}
            alt={team.name}
            width={100}
            height={100}
            className="border-muted rounded-full border-2"
          />
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            {totalGames > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Overall Record: {winrates.overallWins}W -{" "}
                  {winrates.overallLosses}L
                </span>
                <span className="font-semibold">
                  {winrates.overallWinrate.toFixed(1)}% Win Rate
                </span>
              </div>
            )}
          </div>
        </div>
        <TeamRangePicker
          permissions={permissions}
          defaultTimeframe={effectiveTimeframe}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="heroes">Heroes</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="maps">Maps</TabsTrigger>
          <TabsTrigger value="swaps">Swaps</TabsTrigger>
          <TabsTrigger value="teamfights">Teamfights</TabsTrigger>
          <TabsTrigger value="ultimates">Ultimates</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <QuickStatsCard stats={quickStats} />

          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Roster */}
            <TeamRosterGrid roster={teamRoster} />

            {/* Recent Activity Calendar */}
            <RecentActivityCalendar scrims={scrims} dateRange={dateRange} />
          </div>

          {/* Two Column Layout: Top Maps + Strengths/Weaknesses */}
          <div className="grid gap-4 md:grid-cols-2">
            <TopMapsCard
              topMaps={top5Maps}
              winrates={winrates.byMap}
              mapNames={mapNames}
            />
            <StrengthsWeaknessesCard
              bestMap={bestMapByWinrate}
              blindSpot={blindSpotMap}
              mapNames={mapNames}
            />
          </div>

          {/* Role Balance Overview */}
          <div className="grid gap-4 md:grid-cols-1">
            <RoleBalanceRadar
              roleStats={roleStats}
              balanceAnalysis={roleBalance}
            />
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <RolePerformanceCard roleStats={roleStats} />
          <BestRoleTriosCard trios={bestTrios} />
        </TabsContent>

        {/* Heroes Tab */}
        <TabsContent value="heroes" className="space-y-4">
          <HeroPoolContainer
            initialData={heroPool}
            heatmapInitialData={heroPickrateMatrix}
          />
          <HeroBanImpactCard analysis={banImpactAnalysis} />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <WinrateOverTimeChart
            weeklyData={weeklyWinrate}
            monthlyData={monthlyWinrate}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <RecentFormCard recentForm={recentForm} />
            <WinLossStreaksCard streakInfo={streakInfo} />
          </div>
        </TabsContent>

        {/* Maps Tab */}
        <TabsContent value="maps" className="space-y-4">
          <MapModePerformanceCard modePerformance={mapModePerformance} />
          <MapWinrateGallery
            winrates={winrates.byMap}
            mapPlaytimes={mapPlaytimes}
            mapNames={mapNames}
          />
          <PlayerMapPerformanceCard data={playerMapPerformance} />
        </TabsContent>

        {/* Swaps Tab */}
        <TabsContent value="swaps" className="space-y-4">
          <SwapOverviewCard swapStats={heroSwapStats} />
          <SwapTimingCard swapStats={heroSwapStats} />
          <SwapWinrateImpactCard swapStats={heroSwapStats} />
          <SwapPairsCard swapStats={heroSwapStats} />
          <SwapPlayerBreakdownCard swapStats={heroSwapStats} />
        </TabsContent>

        {/* Teamfights Tab */}
        <TabsContent value="teamfights" className="space-y-4">
          <TeamFightStatsCard fightStats={fightStats} />
          <WinProbabilityInsights fightStats={fightStats} />
        </TabsContent>

        {/* Ultimates Tab */}
        <TabsContent value="ultimates" className="space-y-4">
          <UltUsageOverviewCard ultStats={ultStats} />
          <UltimateEconomyCard fightStats={fightStats} />
          <UltRoleBreakdownCard ultStats={ultStats} />
          <UltPlayerRankingsCard ultStats={ultStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
