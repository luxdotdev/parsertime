import { RecentActivityCalendar } from "@/components/profile/recent-activity-calendar";
import { BestRoleTriosCard } from "@/components/stats/team/best-role-trios-card";
import { HeroBanImpactCard } from "@/components/stats/team/hero-ban-impact-card";
import { HeroOurBansCard } from "@/components/stats/team/hero-our-bans-card";
import { HeroPoolContainer } from "@/components/stats/team/hero-pool-container";
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
import { TeamRosterGrid } from "@/components/stats/team/team-roster-grid";
import { TopMapsCard } from "@/components/stats/team/top-maps-card";
import { UltPlayerRankingsCard } from "@/components/stats/team/ult-player-rankings-card";
import { UltRoleBreakdownCard } from "@/components/stats/team/ult-role-breakdown-card";
import { AbilityImpactAnalysisCard } from "@/components/stats/team/ability-impact-analysis-card";
import { UltImpactAnalysisCard } from "@/components/stats/team/ult-impact-analysis-card";
import { UltUsageOverviewCard } from "@/components/stats/team/ult-usage-overview-card";
import { UltimateEconomyCard } from "@/components/stats/team/ultimate-economy-card";
import { WinLossStreaksCard } from "@/components/stats/team/win-loss-streaks-card";
import { WinProbabilityInsights } from "@/components/stats/team/win-probability-insights";
import { WinrateOverTimeChart } from "@/components/stats/team/winrate-over-time-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TournamentTeamStatsService,
  TournamentTeamSharedDataService,
} from "@/data/tournament-team";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { auth } from "@/lib/auth";
import { tournament, simulationTool, ultimateImpactTool } from "@/lib/flags";
import prisma from "@/lib/prisma";
import { getMapNames } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TournamentTeamStatsPage(props: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const tournamentEnabled = await tournament();
  if (!tournamentEnabled) notFound();

  const session = await auth();
  if (!session?.user) notFound();

  const params = await props.params;
  const tournamentId = Number(params.id);
  const tournamentTeamId = Number(params.teamId);
  if (Number.isNaN(tournamentId) || Number.isNaN(tournamentTeamId)) notFound();

  const tournamentData = await prisma.tournament.findFirst({
    where: { id: tournamentId },
    select: { id: true, name: true },
  });
  if (!tournamentData) notFound();

  const tournamentTeam = await prisma.tournamentTeam.findFirst({
    where: { id: tournamentTeamId, tournamentId },
    include: { team: true },
  });
  if (!tournamentTeam) notFound();

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
      heroPickrateMatrix,
      playerMapPerformance,
      simulatorContext,
    },
    scrims,
    mapNames,
    simulationToolEnabled,
    ultimateImpactToolEnabled,
  ] = await Promise.all([
    AppRuntime.runPromise(
      Effect.all(
        {
          teamRoster: TournamentTeamSharedDataService.pipe(
            Effect.flatMap((svc) =>
              svc.getRoster(tournamentId, tournamentTeamId)
            )
          ),
          winrates: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getWinrates(tournamentId, tournamentTeamId)
            )
          ),
          top5Maps: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getTop5MapsByPlaytime(tournamentId, tournamentTeamId)
            )
          ),
          allMapsPlaytime: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getTopMapsByPlaytime(tournamentId, tournamentTeamId)
            )
          ),
          bestMapByWinrate: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getBestMapByWinrate(tournamentId, tournamentTeamId)
            )
          ),
          blindSpotMap: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getBlindSpotMap(tournamentId, tournamentTeamId)
            )
          ),
          fightStats: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getFightStats(tournamentId, tournamentTeamId)
            )
          ),
          roleStats: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getRolePerformanceStats(tournamentId, tournamentTeamId)
            )
          ),
          roleBalance: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getRoleBalanceAnalysis(tournamentId, tournamentTeamId)
            )
          ),
          bestTrios: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getBestRoleTrios(tournamentId, tournamentTeamId)
            )
          ),
          weeklyWinrate: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getWinrateOverTime(tournamentId, tournamentTeamId, "week")
            )
          ),
          monthlyWinrate: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getWinrateOverTime(tournamentId, tournamentTeamId, "month")
            )
          ),
          recentForm: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getRecentForm(tournamentId, tournamentTeamId)
            )
          ),
          streakInfo: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getStreakInfo(tournamentId, tournamentTeamId)
            )
          ),
          mapModePerformance: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getMapModePerformance(tournamentId, tournamentTeamId)
            )
          ),
          quickStats: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getQuickWinsStats(tournamentId, tournamentTeamId)
            )
          ),
          ultStats: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getUltStats(tournamentId, tournamentTeamId)
            )
          ),
          heroSwapStats: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getHeroSwapStats(tournamentId, tournamentTeamId)
            )
          ),
          banImpactAnalysis: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getBanImpactAnalysis(tournamentId, tournamentTeamId)
            )
          ),
          ultImpactAnalysis: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getUltImpact(tournamentId, tournamentTeamId)
            )
          ),
          abilityImpactAnalysis: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getAbilityImpact(tournamentId, tournamentTeamId)
            )
          ),
          matchupWinrateData: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getMatchupWinrateData(tournamentId, tournamentTeamId)
            )
          ),
          heroPool: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getHeroPoolAnalysis(tournamentId, tournamentTeamId)
            )
          ),
          heroPickrateMatrix: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getHeroPickrateMatrix(tournamentId, tournamentTeamId)
            )
          ),
          playerMapPerformance: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getPlayerMapPerformanceMatrix(tournamentId, tournamentTeamId)
            )
          ),
          simulatorContext: TournamentTeamStatsService.pipe(
            Effect.flatMap((svc) =>
              svc.getSimulatorContext(tournamentId, tournamentTeamId)
            )
          ),
        },
        { concurrency: "unbounded" }
      )
    ),
    prisma.scrim.findMany({
      where: {
        tournamentMatch: {
          tournamentId,
          OR: [{ team1Id: tournamentTeamId }, { team2Id: tournamentTeamId }],
        },
      },
    }),
    getMapNames(),
    simulationTool(),
    ultimateImpactTool(),
  ]);

  const mapPlaytimes: Record<string, number> = {};
  allMapsPlaytime.forEach((map) => {
    mapPlaytimes[map.name] = map.playtime;
  });

  const totalGames = winrates.overallWins + winrates.overallLosses;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/tournaments/${tournamentId}` as Route}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Image
            src={
              tournamentTeam.team?.image ??
              `https://avatar.vercel.sh/${tournamentTeam.name}.png`
            }
            alt={tournamentTeam.name}
            width={100}
            height={100}
            className="border-muted rounded-full border-2"
          />
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {tournamentTeam.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {tournamentData.name}
            </p>
            {totalGames > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Tournament Record: {winrates.overallWins}W -{" "}
                  {winrates.overallLosses}L
                </span>
                <span className="font-semibold">
                  {winrates.overallWinrate.toFixed(1)}% Win Rate
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

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
          <TabsTrigger value="winrates">Winrates</TabsTrigger>
          {simulationToolEnabled && (
            <TabsTrigger value="simulator">Simulator</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <QuickStatsCard stats={quickStats} />

          <div className="grid gap-4 md:grid-cols-2">
            <TeamRosterGrid
              roster={teamRoster}
              teamId={tournamentTeam.team?.id ?? tournamentTeamId}
            />
            <RecentActivityCalendar scrims={scrims} />
          </div>

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

          <div className="grid gap-4 md:grid-cols-1">
            <RoleBalanceRadar
              roleStats={roleStats}
              balanceAnalysis={roleBalance}
            />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <RolePerformanceCard roleStats={roleStats} />
          <BestRoleTriosCard trios={bestTrios} />
        </TabsContent>

        <TabsContent value="heroes" className="space-y-4">
          <HeroPoolContainer
            initialData={heroPool}
            heatmapInitialData={heroPickrateMatrix}
          />
          <HeroBanImpactCard analysis={banImpactAnalysis} />
          <HeroOurBansCard outgoing={banImpactAnalysis.outgoing} />
        </TabsContent>

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

        <TabsContent value="maps" className="space-y-4">
          <MapModePerformanceCard modePerformance={mapModePerformance} />
          <MapWinrateGallery
            winrates={winrates.byMap}
            mapPlaytimes={mapPlaytimes}
            mapNames={mapNames}
          />
          <PlayerMapPerformanceCard data={playerMapPerformance} />
        </TabsContent>

        <TabsContent value="swaps" className="space-y-4">
          <SwapOverviewCard swapStats={heroSwapStats} />
          <SwapTimingCard swapStats={heroSwapStats} />
          <SwapWinrateImpactCard swapStats={heroSwapStats} />
          <SwapPairsCard swapStats={heroSwapStats} />
          <SwapPlayerBreakdownCard swapStats={heroSwapStats} />
        </TabsContent>

        <TabsContent value="teamfights" className="space-y-4">
          <TeamFightStatsCard fightStats={fightStats} />
          <WinProbabilityInsights fightStats={fightStats} />
          <AbilityImpactAnalysisCard analysis={abilityImpactAnalysis} />
        </TabsContent>

        <TabsContent value="ultimates" className="space-y-4">
          <UltUsageOverviewCard ultStats={ultStats} />
          {ultimateImpactToolEnabled && (
            <UltImpactAnalysisCard analysis={ultImpactAnalysis} />
          )}
          <UltimateEconomyCard fightStats={fightStats} />
          <UltRoleBreakdownCard ultStats={ultStats} />
          <UltPlayerRankingsCard ultStats={ultStats} />
        </TabsContent>

        <TabsContent value="winrates" className="space-y-4">
          <MatchupWinrateTab data={matchupWinrateData} />
        </TabsContent>

        <TabsContent value="simulator" className="space-y-4">
          <SimulatorTab ctx={simulatorContext} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
