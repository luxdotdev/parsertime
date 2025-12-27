import { RecentActivityCalendar } from "@/components/profile/recent-activity-calendar";
import { BestRoleTriosCard } from "@/components/stats/team/best-role-trios-card";
import { HeroPickrateHeatmap } from "@/components/stats/team/hero-pickrate-heatmap";
import { HeroPoolContainer } from "@/components/stats/team/hero-pool-container";
import { MapModePerformanceCard } from "@/components/stats/team/map-mode-performance-card";
import { MapWinrateGallery } from "@/components/stats/team/map-winrate-gallery";
import { PlayerMapPerformanceCard } from "@/components/stats/team/player-map-performance-card";
import { QuickStatsCard } from "@/components/stats/team/quick-stats-card";
import { RecentFormCard } from "@/components/stats/team/recent-form-card";
import { RoleBalanceRadar } from "@/components/stats/team/role-balance-radar";
import { RolePerformanceCard } from "@/components/stats/team/role-performance-card";
import { StrengthsWeaknessesCard } from "@/components/stats/team/strengths-weaknesses-card";
import { TeamFightStatsCard } from "@/components/stats/team/team-fight-stats-card";
import { TeamRosterGrid } from "@/components/stats/team/team-roster-grid";
import { TopMapsCard } from "@/components/stats/team/top-maps-card";
import { UltimateEconomyCard } from "@/components/stats/team/ultimate-economy-card";
import { WinLossStreaksCard } from "@/components/stats/team/win-loss-streaks-card";
import { WinProbabilityInsights } from "@/components/stats/team/win-probability-insights";
import { WinrateOverTimeChart } from "@/components/stats/team/winrate-over-time-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getHeroPickrateMatrix,
  getPlayerMapPerformanceMatrix,
} from "@/data/team-analytics-dto";
import { getTeamFightStats } from "@/data/team-fight-stats-dto";
import {
  getHeroPoolAnalysis,
  getHeroPoolRawData,
} from "@/data/team-hero-pool-dto";
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
import {
  getBestMapByWinrate,
  getBlindSpotMap,
  getTeamRoster,
  getTeamWinrates,
  getTop5MapsByPlaytime,
  getTopMapsByPlaytime,
} from "@/data/team-stats-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getMapNames } from "@/lib/utils";
import type { PagePropsWithLocale } from "@/types/next";
import { $Enums } from "@prisma/client";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function TeamStatsPage(
  props: PagePropsWithLocale<"/stats/team/[teamId]">
) {
  const session = await auth();
  const user = await getUser(session?.user.email);
  if (!user) notFound();

  const params = await props.params;
  const teamId = parseInt(params.teamId);

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    include: { users: true },
  });
  if (!team) notFound();

  // If the user is not a member of the team and is not an admin, do not show the page
  const userIsMember = team.users.some((teamUser) => teamUser.id === user.id);
  if (!userIsMember && user.role !== $Enums.UserRole.ADMIN) notFound();

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
    heroPool,
    heroPoolRawData,
    quickStats,
    heroPickrateMatrix,
    playerMapPerformance,
  ] = await Promise.all([
    prisma.scrim.findMany({
      where: { teamId },
    }),
    getTeamRoster(teamId),
    getTeamWinrates(teamId),
    getTop5MapsByPlaytime(teamId),
    getTopMapsByPlaytime(teamId),
    getBestMapByWinrate(teamId),
    getBlindSpotMap(teamId),
    getTeamFightStats(teamId),
    getMapNames(),
    getRolePerformanceStats(teamId),
    getRoleBalanceAnalysis(teamId),
    getBestRoleTrios(teamId),
    getWinrateOverTime(teamId, "week"),
    getWinrateOverTime(teamId, "month"),
    getRecentForm(teamId),
    getStreakInfo(teamId),
    getMapModePerformance(teamId),
    getHeroPoolAnalysis(teamId),
    getHeroPoolRawData(teamId),
    getQuickWinsStats(teamId),
    getHeroPickrateMatrix(teamId),
    getPlayerMapPerformanceMatrix(teamId),
  ]);

  // Convert playtime array to Record for gallery
  const mapPlaytimes: Record<string, number> = {};
  allMapsPlaytime.forEach((map) => {
    mapPlaytimes[map.name] = map.playtime;
  });

  const totalGames = winrates.overallWins + winrates.overallLosses;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header Section */}
      <div className="mb-6 flex items-center gap-4">
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

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="heroes">Heroes</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="maps">Maps</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="teamfights">Teamfights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <QuickStatsCard stats={quickStats} />

          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Roster */}
            <TeamRosterGrid roster={teamRoster} />

            {/* Recent Activity Calendar */}
            <RecentActivityCalendar scrims={scrims} />
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
          <HeroPoolContainer rawData={heroPoolRawData} initialData={heroPool} />
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
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <HeroPickrateHeatmap data={heroPickrateMatrix} />
          <PlayerMapPerformanceCard data={playerMapPerformance} />
        </TabsContent>

        {/* Teamfights Tab */}
        <TabsContent value="teamfights" className="space-y-4">
          <UltimateEconomyCard fightStats={fightStats} />
          <TeamFightStatsCard fightStats={fightStats} />
          <WinProbabilityInsights fightStats={fightStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
