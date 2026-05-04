import { RecentActivityCalendar } from "@/components/profile/recent-activity-calendar";
import { AbilityImpactAnalysisCard } from "@/components/stats/team/ability-impact-analysis-card";
import { BestRoleTriosCard } from "@/components/stats/team/best-role-trios-card";
import { HeroBanImpactCard } from "@/components/stats/team/hero-ban-impact-card";
import { HeroOurBansCard } from "@/components/stats/team/hero-our-bans-card";
import { HeroPoolContainer } from "@/components/stats/team/hero-pool-container";
import { InsufficientScrimsPlaceholder } from "@/components/stats/team/insufficient-scrims-placeholder";
import { MapModePerformanceCard } from "@/components/stats/team/map-mode-performance-card";
import { MapWinrateGallery } from "@/components/stats/team/map-winrate-gallery";
import { MatchupWinrateTab } from "@/components/stats/team/matchup-winrate-tab";
import { PlayerMapPerformanceCard } from "@/components/stats/team/player-map-performance-card";
import { QuickStatsCard } from "@/components/stats/team/quick-stats-card";
import { RecentFormCard } from "@/components/stats/team/recent-form-card";
import { RoleBalanceRadar } from "@/components/stats/team/role-balance-radar";
import { RolePerformanceCard } from "@/components/stats/team/role-performance-card";
import { SimulatorTab } from "@/components/stats/team/simulator-tab";
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
import { UltImpactAnalysisCard } from "@/components/stats/team/ult-impact-analysis-card";
import { UltPlayerRankingsCard } from "@/components/stats/team/ult-player-rankings-card";
import { UltRoleBreakdownCard } from "@/components/stats/team/ult-role-breakdown-card";
import { UltUsageOverviewCard } from "@/components/stats/team/ult-usage-overview-card";
import { UltimateEconomyCard } from "@/components/stats/team/ultimate-economy-card";
import { WinLossStreaksCard } from "@/components/stats/team/win-loss-streaks-card";
import { WinProbabilityInsights } from "@/components/stats/team/win-probability-insights";
import { WinrateOverTimeChart } from "@/components/stats/team/winrate-over-time-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppRuntime } from "@/data/runtime";
import {
  TeamAbilityImpactService,
  TeamAnalyticsService,
  TeamBanImpactService,
  type TeamDateRange,
  TeamFightStatsService,
  TeamHeroPoolService,
  TeamHeroSwapService,
  TeamMapModeService,
  TeamMatchupService,
  TeamPredictionService,
  TeamQuickWinsService,
  TeamRoleStatsService,
  TeamSharedDataService,
  TeamStatsService,
  TeamTrendsService,
  TeamUltService,
} from "@/data/team";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { simulationTool, ultimateImpactTool } from "@/lib/flags";
import { calculateHeroPickrateMatrix } from "@/lib/hero-pickrate-utils";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { isValidTimeframe, type Timeframe } from "@/lib/timeframe";
import { getMapNames } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import { addMonths, addWeeks, addYears } from "date-fns";
import { Effect } from "effect";
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

function formatTimeframeLabel(timeframe: Timeframe): string {
  switch (timeframe) {
    case "one-week":
      return "Last 7 days";
    case "two-weeks":
      return "Last 14 days";
    case "one-month":
      return "Last 30 days";
    case "three-months":
      return "Last 3 months";
    case "six-months":
      return "Last 6 months";
    case "one-year":
      return "Last 365 days";
    case "all-time":
      return "All time";
    case "custom":
      return "Custom range";
  }
}

const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary rounded-none bg-transparent px-0 pb-3 pt-1 font-mono text-[11px] tracking-[0.16em] uppercase shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary transition-colors";

export default async function TeamStatsPage(
  props: PagePropsWithLocale<"/stats/team/[teamId]"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user.email)))
  );
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

  const totalScrimCount = await prisma.scrim.count({ where: { teamId } });

  if (totalScrimCount < 2) {
    return (
      <div className="px-6 pt-8 pb-16 sm:px-10">
        <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
          <div className="flex items-end gap-4">
            <Image
              src={team.image ?? `https://avatar.vercel.sh/${team.name}.png`}
              alt={team.name}
              width={48}
              height={48}
              className="border-border h-12 w-12 shrink-0 rounded-full border object-cover"
            />
            <div>
              <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
                Team
              </p>
              <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
                {team.name}
              </h1>
            </div>
          </div>
        </header>
        <div className="mt-8">
          <InsufficientScrimsPlaceholder scrimCount={totalScrimCount} />
        </div>
      </div>
    );
  }

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
    {
      teamRoster,
      winrates,
      top5Maps,
      allMapsPlaytime,
      bestMapByWinrate,
      blindSpotMap,
      fightStats,
      roleStats,
      roleBalance,
      bestTrios,
      weeklyWinrate,
      monthlyWinrate,
      recentForm,
      streakInfo,
      mapModePerformance,
      quickStats,
      ultStats,
      heroSwapStats,
      banImpactAnalysis,
      ultImpactAnalysis,
      abilityImpactAnalysis,
      matchupWinrateData,
      heroPool,
    },
    scrims,
    mapNames,
    playerMapPerformance,
    simulatorContext,
    simulationToolEnabled,
    ultimateImpactToolEnabled,
    heroPickrateRawData,
  ] = await Promise.all([
    AppRuntime.runPromise(
      Effect.all(
        {
          teamRoster: TeamSharedDataService.pipe(
            Effect.flatMap((svc) => svc.getTeamRoster(teamId))
          ),
          winrates: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getTeamWinrates(teamId, dateRange))
          ),
          top5Maps: TeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getTop5MapsByPlaytime(teamId, dateRange)
            )
          ),
          allMapsPlaytime: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getTopMapsByPlaytime(teamId, dateRange))
          ),
          bestMapByWinrate: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getBestMapByWinrate(teamId, dateRange))
          ),
          blindSpotMap: TeamStatsService.pipe(
            Effect.flatMap((svc) => svc.getBlindSpotMap(teamId, dateRange))
          ),
          fightStats: TeamFightStatsService.pipe(
            Effect.flatMap((svc) => svc.getTeamFightStats(teamId, dateRange))
          ),
          roleStats: TeamRoleStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getRolePerformanceStats(teamId, dateRange)
            )
          ),
          roleBalance: TeamRoleStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getRoleBalanceAnalysis(teamId, dateRange)
            )
          ),
          bestTrios: TeamRoleStatsService.pipe(
            Effect.flatMap((svc) => svc.getBestRoleTrios(teamId, dateRange))
          ),
          weeklyWinrate: TeamTrendsService.pipe(
            Effect.flatMap((svc) =>
              svc.getWinrateOverTime(teamId, "week", dateRange)
            )
          ),
          monthlyWinrate: TeamTrendsService.pipe(
            Effect.flatMap((svc) =>
              svc.getWinrateOverTime(teamId, "month", dateRange)
            )
          ),
          recentForm: TeamTrendsService.pipe(
            Effect.flatMap((svc) => svc.getRecentForm(teamId, dateRange))
          ),
          streakInfo: TeamTrendsService.pipe(
            Effect.flatMap((svc) => svc.getStreakInfo(teamId, dateRange))
          ),
          mapModePerformance: TeamMapModeService.pipe(
            Effect.flatMap((svc) =>
              svc.getMapModePerformance(teamId, dateRange)
            )
          ),
          quickStats: TeamQuickWinsService.pipe(
            Effect.flatMap((svc) => svc.getQuickWinsStats(teamId, dateRange))
          ),
          ultStats: TeamUltService.pipe(
            Effect.flatMap((svc) => svc.getTeamUltStats(teamId, dateRange))
          ),
          heroSwapStats: TeamHeroSwapService.pipe(
            Effect.flatMap((svc) => svc.getTeamHeroSwapStats(teamId, dateRange))
          ),
          banImpactAnalysis: TeamBanImpactService.pipe(
            Effect.flatMap((svc) =>
              svc.getTeamBanImpactAnalysis(teamId, dateRange)
            )
          ),
          ultImpactAnalysis: TeamUltService.pipe(
            Effect.flatMap((svc) => svc.getTeamUltImpact(teamId, dateRange))
          ),
          abilityImpactAnalysis: TeamAbilityImpactService.pipe(
            Effect.flatMap((svc) => svc.getTeamAbilityImpact(teamId, dateRange))
          ),
          matchupWinrateData: TeamMatchupService.pipe(
            Effect.flatMap((svc) =>
              svc.getMatchupWinrateData(teamId, dateRange)
            )
          ),
          heroPool: TeamHeroPoolService.pipe(
            Effect.flatMap((svc) =>
              svc.getHeroPoolAnalysis(teamId, dateRange?.from, dateRange?.to)
            )
          ),
        },
        { concurrency: "unbounded" }
      )
    ),
    prisma.scrim.findMany({
      where: {
        teamId,
        ...(dateRange && { date: { gte: dateRange.from, lte: dateRange.to } }),
      },
    }),
    getMapNames(),
    AppRuntime.runPromise(
      TeamAnalyticsService.pipe(
        Effect.flatMap((svc) =>
          svc.getPlayerMapPerformanceMatrix(teamId, dateRange)
        )
      )
    ),
    AppRuntime.runPromise(
      TeamPredictionService.pipe(
        Effect.flatMap((svc) => svc.getSimulatorContext(teamId, dateRange))
      )
    ),
    simulationTool(),
    ultimateImpactTool(),
    AppRuntime.runPromise(
      TeamAnalyticsService.pipe(
        Effect.flatMap((svc) => svc.getHeroPickrateRawData(teamId, dateRange))
      )
    ),
  ]);
  const heroPickrateMatrix = calculateHeroPickrateMatrix(heroPickrateRawData);

  const mapPlaytimes: Record<string, number> = {};
  allMapsPlaytime.forEach((map) => {
    mapPlaytimes[map.name] = map.playtime;
  });

  const totalGames = winrates.overallWins + winrates.overallLosses;
  const timeframeLabel = formatTimeframeLabel(effectiveTimeframe);

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div className="flex items-end gap-4">
          <Image
            src={team.image ?? `https://avatar.vercel.sh/${team.name}.png`}
            alt={team.name}
            width={48}
            height={48}
            className="border-border h-12 w-12 shrink-0 rounded-full border object-cover"
          />
          <div>
            <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
              Team · {timeframeLabel}
            </p>
            <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
              {team.name}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          {totalGames > 0 ? (
            <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono">
              <Stat
                label="Record"
                value={`${winrates.overallWins}–${winrates.overallLosses}`}
              />
              <Stat
                label="Winrate"
                value={`${winrates.overallWinrate.toFixed(1)}%`}
              />
              <Stat label="Scrims" value={totalScrimCount} />
            </dl>
          ) : null}
          <TeamRangePicker
            permissions={permissions}
            defaultTimeframe={effectiveTimeframe}
          />
        </div>
      </header>

      <Tabs defaultValue="overview" className="mt-6 space-y-8">
        <TabsList className="border-border h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="overview" className={tabTriggerClass}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className={tabTriggerClass}>
            Performance
          </TabsTrigger>
          <TabsTrigger value="heroes" className={tabTriggerClass}>
            Heroes
          </TabsTrigger>
          <TabsTrigger value="trends" className={tabTriggerClass}>
            Trends
          </TabsTrigger>
          <TabsTrigger value="maps" className={tabTriggerClass}>
            Maps
          </TabsTrigger>
          <TabsTrigger value="swaps" className={tabTriggerClass}>
            Swaps
          </TabsTrigger>
          <TabsTrigger value="teamfights" className={tabTriggerClass}>
            Teamfights
          </TabsTrigger>
          <TabsTrigger value="ultimates" className={tabTriggerClass}>
            Ultimates
          </TabsTrigger>
          <TabsTrigger value="winrates" className={tabTriggerClass}>
            Winrates
          </TabsTrigger>
          {simulationToolEnabled && (
            <TabsTrigger value="simulator" className={tabTriggerClass}>
              Simulator
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <QuickStatsCard stats={quickStats} />

          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Roster */}
            <TeamRosterGrid roster={teamRoster} teamId={teamId} />

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
        <TabsContent value="performance" className="space-y-6">
          <RolePerformanceCard roleStats={roleStats} />
          <BestRoleTriosCard trios={bestTrios} />
        </TabsContent>

        {/* Heroes Tab */}
        <TabsContent value="heroes" className="space-y-6">
          <HeroPoolContainer
            initialData={heroPool}
            heatmapInitialData={heroPickrateMatrix}
          />
          <HeroBanImpactCard analysis={banImpactAnalysis} />
          <HeroOurBansCard outgoing={banImpactAnalysis.outgoing} />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
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
        <TabsContent value="maps" className="space-y-6">
          <MapModePerformanceCard modePerformance={mapModePerformance} />
          <MapWinrateGallery
            winrates={winrates.byMap}
            mapPlaytimes={mapPlaytimes}
            mapNames={mapNames}
          />
          <PlayerMapPerformanceCard data={playerMapPerformance} />
        </TabsContent>

        {/* Swaps Tab */}
        <TabsContent value="swaps" className="space-y-6">
          <SwapOverviewCard swapStats={heroSwapStats} />
          <SwapTimingCard swapStats={heroSwapStats} />
          <SwapWinrateImpactCard swapStats={heroSwapStats} />
          <SwapPairsCard swapStats={heroSwapStats} />
          <SwapPlayerBreakdownCard swapStats={heroSwapStats} />
        </TabsContent>

        {/* Teamfights Tab */}
        <TabsContent value="teamfights" className="space-y-6">
          <TeamFightStatsCard fightStats={fightStats} />
          <WinProbabilityInsights fightStats={fightStats} />
          <AbilityImpactAnalysisCard analysis={abilityImpactAnalysis} />
        </TabsContent>

        {/* Ultimates Tab */}
        <TabsContent value="ultimates" className="space-y-6">
          <UltUsageOverviewCard ultStats={ultStats} />
          {ultimateImpactToolEnabled && (
            <UltImpactAnalysisCard analysis={ultImpactAnalysis} />
          )}
          <UltimateEconomyCard fightStats={fightStats} />
          <UltRoleBreakdownCard ultStats={ultStats} />
          <UltPlayerRankingsCard ultStats={ultStats} />
        </TabsContent>

        {/* Winrates Tab */}
        <TabsContent value="winrates" className="space-y-6">
          <MatchupWinrateTab data={matchupWinrateData} />
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simulator" className="space-y-6">
          <SimulatorTab ctx={simulatorContext} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
        {label}
      </dt>
      <dd className="text-lg font-medium tabular-nums">{value}</dd>
    </div>
  );
}
