import { AbilityImpactAnalysisCard } from "@/components/stats/team/ability-impact-analysis-card";
import { BestRoleTriosCard } from "@/components/stats/team/best-role-trios-card";
import { HeroBanImpactCard } from "@/components/stats/team/hero-ban-impact-card";
import { HeroOurBansCard } from "@/components/stats/team/hero-our-bans-card";
import { HeroPoolContainer } from "@/components/stats/team/hero-pool-container";
import { InsufficientScrimsPlaceholder } from "@/components/stats/team/insufficient-scrims-placeholder";
import { MapModePerformanceCard } from "@/components/stats/team/map-mode-performance-card";
import { MapPerformanceTable } from "@/components/stats/team/map-performance-table";
import { MapWinrateGallery } from "@/components/stats/team/map-winrate-gallery";
import { MatchupWinrateTab } from "@/components/stats/team/matchup-winrate-tab";
import { OverviewInsightsBand } from "@/components/stats/team/overview-insights-band";
import { PlayerMapPerformanceCard } from "@/components/stats/team/player-map-performance-card";
import { QuickStatsRibbon } from "@/components/stats/team/quick-stats-ribbon";
import { RecentFormCard } from "@/components/stats/team/recent-form-card";
import { RolePerformanceCard } from "@/components/stats/team/role-performance-card";
import { SimulatorTab } from "@/components/stats/team/simulator-tab";
import { SwapOverviewCard } from "@/components/stats/team/swap-overview-card";
import { SwapPairsCard } from "@/components/stats/team/swap-pairs-card";
import { SwapPlayerBreakdownCard } from "@/components/stats/team/swap-player-breakdown-card";
import { SwapTimingCard } from "@/components/stats/team/swap-timing-card";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { SwapWinrateImpactCard } from "@/components/stats/team/swap-winrate-impact-card";
import { TeamFightStatsCard } from "@/components/stats/team/team-fight-stats-card";
import { TeamRangePicker } from "@/components/stats/team/team-range-picker";
import { TeamRosterGrid } from "@/components/stats/team/team-roster-grid";
import { TeamTsrStat } from "@/components/stats/team/team-tsr-stat";
import { UltImpactAnalysisCard } from "@/components/stats/team/ult-impact-analysis-card";
import { UltPlayerRankingsCard } from "@/components/stats/team/ult-player-rankings-card";
import { UltRoleBreakdownCard } from "@/components/stats/team/ult-role-breakdown-card";
import { UltCombosCard } from "@/components/stats/team/ult-combos-card";
import { UltEconomyCard } from "@/components/stats/team/ult-economy-card";
import { UltResponseCard } from "@/components/stats/team/ult-response-card";
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
import { computeTeamTsr } from "@/lib/tsr/team";
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
      ultCombos,
      ultEconomy,
      heroSwapStats,
      banImpactAnalysis,
      ultImpactAnalysis,
      abilityImpactAnalysis,
      matchupWinrateData,
      heroPool,
    },
    teamTsr,
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
          ultCombos: TeamUltService.pipe(
            Effect.flatMap((svc) => svc.getTeamUltCombos(teamId, dateRange))
          ),
          ultEconomy: TeamUltService.pipe(
            Effect.flatMap((svc) => svc.getTeamUltEconomy(teamId, dateRange))
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
    prisma.scrim
      .findMany({ where: { teamId }, select: { id: true } })
      .then((rows) =>
        computeTeamTsr(
          team.users.map((u) => ({
            id: u.id,
            name: u.name,
            battletag: u.battletag,
          })),
          rows.map((r) => r.id)
        )
      ),
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
              <TeamTsrStat result={teamTsr} />
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

        <TabsContent value="overview" className="space-y-12">
          <QuickStatsRibbon
            stats={quickStats}
            uniqueHeroes={heroPool.diversity.totalUniqueHeroes}
            uniqueMaps={allMapsPlaytime.length}
          />

          <OverviewInsightsBand
            quickStats={quickStats}
            roleStats={roleStats}
            roleBalance={roleBalance}
            bestMap={bestMapByWinrate}
            blindSpot={blindSpotMap}
            mapNames={mapNames}
          />

          <MapPerformanceTable
            topMaps={top5Maps}
            winrates={winrates.byMap}
            bestMap={bestMapByWinrate}
            blindSpot={blindSpotMap}
            mapNames={mapNames}
          />

          <TeamRosterGrid roster={teamRoster} teamId={teamId} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-12">
          <StatRibbon
            cells={[
              {
                label: "Tank K/D",
                value: roleStats.Tank.kd.toFixed(2),
                sub:
                  roleStats.Tank.totalPlaytime > 0
                    ? `${(roleStats.Tank.totalPlaytime / 3600).toFixed(1)}h played`
                    : "no playtime",
              },
              {
                label: "Damage K/D",
                value: roleStats.Damage.kd.toFixed(2),
                sub:
                  roleStats.Damage.totalPlaytime > 0
                    ? `${(roleStats.Damage.totalPlaytime / 3600).toFixed(1)}h played`
                    : "no playtime",
              },
              {
                label: "Support K/D",
                value: roleStats.Support.kd.toFixed(2),
                sub:
                  roleStats.Support.totalPlaytime > 0
                    ? `${(roleStats.Support.totalPlaytime / 3600).toFixed(1)}h played`
                    : "no playtime",
              },
              {
                label: "Best role",
                value: roleBalance.strongestRole ?? "—",
                sub: roleBalance.strongestRole
                  ? "leading K/D"
                  : "insufficient data",
                emphasis: !!roleBalance.strongestRole,
              },
            ]}
            columns={4}
          />
          <RolePerformanceCard roleStats={roleStats} />
          <BestRoleTriosCard trios={bestTrios} />
        </TabsContent>

        {/* Heroes Tab */}
        <TabsContent value="heroes" className="space-y-12">
          <StatRibbon
            cells={[
              {
                label: "Heroes played",
                value: String(heroPool.diversity.totalUniqueHeroes),
                sub: "unique heroes",
                emphasis: true,
              },
              {
                label: "Effective pool",
                value: heroPool.diversity.effectiveHeroPool.toFixed(1),
                sub: "core rotation",
              },
              {
                label: "Top winrate",
                value: heroPool.topHeroWinrates[0]
                  ? `${heroPool.topHeroWinrates[0].winrate.toFixed(0)}%`
                  : "—",
                sub: heroPool.topHeroWinrates[0]?.heroName ?? "—",
              },
              {
                label: "Bans against us",
                value: String(banImpactAnalysis.received.totalMapsAnalyzed),
                sub: `${banImpactAnalysis.received.banImpacts.length} unique`,
              },
            ]}
            columns={4}
          />
          <HeroPoolContainer
            initialData={heroPool}
            heatmapInitialData={heroPickrateMatrix}
          />
          <HeroBanImpactCard analysis={banImpactAnalysis} />
          <HeroOurBansCard outgoing={banImpactAnalysis.outgoing} />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-12">
          <StatRibbon
            cells={[
              {
                label: "Last 5",
                value:
                  recentForm.last5.length > 0
                    ? `${recentForm.last5Winrate.toFixed(0)}%`
                    : "—",
                sub:
                  recentForm.last5.length > 0
                    ? `${recentForm.last5.filter((m) => m.result === "win").length}–${recentForm.last5.filter((m) => m.result === "loss").length}`
                    : "no data",
                emphasis: true,
              },
              {
                label: "Last 10",
                value:
                  recentForm.last10.length > 0
                    ? `${recentForm.last10Winrate.toFixed(0)}%`
                    : "—",
                sub:
                  recentForm.last10.length > 0
                    ? `${recentForm.last10.filter((m) => m.result === "win").length}–${recentForm.last10.filter((m) => m.result === "loss").length}`
                    : "no data",
              },
              {
                label: "Last 20",
                value:
                  recentForm.last20.length > 0
                    ? `${recentForm.last20Winrate.toFixed(0)}%`
                    : "—",
                sub:
                  recentForm.last20.length > 0
                    ? `${recentForm.last20.filter((m) => m.result === "win").length}–${recentForm.last20.filter((m) => m.result === "loss").length}`
                    : "no data",
              },
              {
                label: "Current streak",
                value:
                  streakInfo.currentStreak.count > 0
                    ? `${streakInfo.currentStreak.count}${streakInfo.currentStreak.type === "win" ? "W" : "L"}`
                    : "—",
                sub:
                  streakInfo.longestWinStreak.count > 0
                    ? `${streakInfo.longestWinStreak.count}W best run`
                    : "no streaks yet",
              },
            ]}
            columns={4}
          />
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
        <TabsContent value="maps" className="space-y-12">
          <StatRibbon
            cells={[
              {
                label: "Maps played",
                value: String(allMapsPlaytime.length),
                sub: "unique maps",
                emphasis: true,
              },
              {
                label: "Best mode",
                value: mapModePerformance.bestMode ?? "—",
                sub: mapModePerformance.bestMode
                  ? `${mapModePerformance.byMode[mapModePerformance.bestMode].winrate.toFixed(0)}% winrate`
                  : "no data",
              },
              {
                label: "Bleed mode",
                value: mapModePerformance.worstMode ?? "—",
                sub: mapModePerformance.worstMode
                  ? `${mapModePerformance.byMode[mapModePerformance.worstMode].winrate.toFixed(0)}% winrate`
                  : "no data",
              },
              {
                label: "Modes played",
                value: String(
                  Object.values(mapModePerformance.byMode).filter(
                    (m) => m.gamesPlayed > 0
                  ).length
                ),
                sub: "with games",
              },
            ]}
            columns={4}
          />
          <MapModePerformanceCard modePerformance={mapModePerformance} />
          <MapWinrateGallery
            winrates={winrates.byMap}
            mapPlaytimes={mapPlaytimes}
            mapNames={mapNames}
          />
          <PlayerMapPerformanceCard data={playerMapPerformance} />
        </TabsContent>

        {/* Swaps Tab */}
        <TabsContent value="swaps" className="space-y-12">
          <StatRibbon
            cells={[
              {
                label: "Total swaps",
                value: String(heroSwapStats.totalSwaps),
                sub: `across ${heroSwapStats.totalMaps} maps`,
                emphasis: true,
              },
              {
                label: "Swaps per map",
                value: heroSwapStats.swapsPerMap.toFixed(1),
                sub: "average",
              },
              {
                label: "Post-swap WR",
                value:
                  heroSwapStats.swapWins + heroSwapStats.swapLosses > 0
                    ? `${heroSwapStats.swapWinrate.toFixed(0)}%`
                    : "—",
                sub:
                  heroSwapStats.swapWins + heroSwapStats.swapLosses > 0
                    ? `${heroSwapStats.swapWins}–${heroSwapStats.swapLosses}`
                    : "no swap maps",
              },
              {
                label: "No-swap WR",
                value:
                  heroSwapStats.noSwapWins + heroSwapStats.noSwapLosses > 0
                    ? `${heroSwapStats.noSwapWinrate.toFixed(0)}%`
                    : "—",
                sub:
                  heroSwapStats.noSwapWins + heroSwapStats.noSwapLosses > 0
                    ? `${heroSwapStats.noSwapWins}–${heroSwapStats.noSwapLosses}`
                    : "no static maps",
              },
            ]}
            columns={4}
          />
          <SwapOverviewCard swapStats={heroSwapStats} />
          <SwapTimingCard swapStats={heroSwapStats} />
          <SwapWinrateImpactCard swapStats={heroSwapStats} />
          <SwapPairsCard swapStats={heroSwapStats} />
          <SwapPlayerBreakdownCard swapStats={heroSwapStats} />
        </TabsContent>

        {/* Teamfights Tab */}
        <TabsContent value="teamfights" className="space-y-12">
          <StatRibbon
            cells={[
              {
                label: "Fight winrate",
                value:
                  fightStats.totalFights > 0
                    ? `${fightStats.overallWinrate.toFixed(0)}%`
                    : "—",
                sub:
                  fightStats.totalFights > 0
                    ? `${fightStats.fightsWon}–${fightStats.fightsLost} of ${fightStats.totalFights}`
                    : "no fights",
                emphasis: true,
              },
              {
                label: "First pick",
                value:
                  fightStats.firstPickFights > 0
                    ? `${fightStats.firstPickWinrate.toFixed(0)}%`
                    : "—",
                sub:
                  fightStats.firstPickFights > 0
                    ? `${fightStats.firstPickFights} fights`
                    : "no data",
              },
              {
                label: "First death",
                value:
                  fightStats.firstDeathFights > 0
                    ? `${fightStats.firstDeathWinrate.toFixed(0)}%`
                    : "—",
                sub:
                  fightStats.firstDeathFights > 0
                    ? `${fightStats.firstDeathFights} fights`
                    : "no data",
              },
              {
                label: "Dry fight WR",
                value:
                  fightStats.dryFights > 0
                    ? `${fightStats.dryFightWinrate.toFixed(0)}%`
                    : "—",
                sub:
                  fightStats.dryFights > 0
                    ? `${fightStats.dryFights} fights`
                    : "no dry fights",
              },
            ]}
            columns={4}
          />
          <TeamFightStatsCard fightStats={fightStats} />
          <WinProbabilityInsights fightStats={fightStats} />
          <AbilityImpactAnalysisCard analysis={abilityImpactAnalysis} />
        </TabsContent>

        {/* Ultimates Tab */}
        <TabsContent value="ultimates" className="space-y-12">
          <StatRibbon
            cells={[
              {
                label: "Total ults",
                value: String(ultStats.totalUltsUsed),
                sub: `${ultStats.ultsPerMap.toFixed(1)} per map`,
                emphasis: true,
              },
              {
                label: "In fights",
                value: `${ultStats.fightInitiationRate.toFixed(0)}%`,
                sub: `${ultStats.fightInitiationCount} initiations`,
              },
              {
                label: "Avg charge",
                value: `${ultStats.avgChargeTime.toFixed(0)}s`,
                sub: `held ${ultStats.avgHoldTime.toFixed(0)}s`,
              },
              {
                label: "Wasted",
                value: String(fightStats.wastedUltimates),
                sub: "no fight impact",
              },
            ]}
            columns={4}
          />
          <UltUsageOverviewCard ultStats={ultStats} />
          {ultimateImpactToolEnabled && (
            <UltImpactAnalysisCard analysis={ultImpactAnalysis} />
          )}
          <UltCombosCard analysis={ultCombos} />
          <UltResponseCard analysis={ultCombos} />
          <UltimateEconomyCard fightStats={fightStats} />
          <UltEconomyCard analysis={ultEconomy} />
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
