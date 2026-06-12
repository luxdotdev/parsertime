"use client";

import { ActivityHeatmap } from "@/components/ranked/charts/activity-heatmap";
import { BestHeroPerMapCard } from "@/components/ranked/charts/best-hero-per-map-card";
import { DayOfWeekCard } from "@/components/ranked/charts/day-of-week-card";
import { GameModeDistributionChart } from "@/components/ranked/charts/game-mode-distribution-chart";
import { GameModeWinrateChart } from "@/components/ranked/charts/game-mode-winrate-chart";
import { GroupSizeBreakdownChart } from "@/components/ranked/charts/group-size-breakdown-chart";
import { GroupSizeWinrateChart } from "@/components/ranked/charts/group-size-winrate-chart";
import { HeroMapSynergyMatrix } from "@/components/ranked/charts/hero-map-synergy-matrix";
import { HeroPoolDiversityCard } from "@/components/ranked/charts/hero-pool-diversity-card";
import { HeroSwapAnalyticsChart } from "@/components/ranked/charts/hero-swap-analytics-chart";
import { HeroWinrateChart } from "@/components/ranked/charts/hero-winrate-chart";
import { MapFamiliarityCard } from "@/components/ranked/charts/map-familiarity-card";
import { MapLearningCurveCard } from "@/components/ranked/charts/map-learning-curve-card";
import { MapTierListCard } from "@/components/ranked/charts/map-tier-list-card";
import { MapTimelineCard } from "@/components/ranked/charts/map-timeline-card";
import { MapVolatilityCard } from "@/components/ranked/charts/map-volatility-card";
import { MapWinLossChart } from "@/components/ranked/charts/map-win-loss-chart";
import { MapWinrateRankingChart } from "@/components/ranked/charts/map-winrate-ranking-chart";
import { MostPlayedHeroesChart } from "@/components/ranked/charts/most-played-heroes-chart";
import { OneTrickDetectionCard } from "@/components/ranked/charts/one-trick-detection-card";
import { PatchImpactChart } from "@/components/ranked/charts/patch-impact-chart";
import { RecentFormChart } from "@/components/ranked/charts/recent-form-chart";
import { RepeatMapCard } from "@/components/ranked/charts/repeat-map-card";
import { RoleDistributionChart } from "@/components/ranked/charts/role-distribution-chart";
import { RoleFlexibilityCard } from "@/components/ranked/charts/role-flexibility-card";
import { RoleWinrateChart } from "@/components/ranked/charts/role-winrate-chart";
import { SessionAnalysisCard } from "@/components/ranked/charts/session-analysis-card";
import { StreakChart } from "@/components/ranked/charts/streak-chart";
import { WinrateTrendChart } from "@/components/ranked/charts/winrate-trend-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ActivityHeatmapResult,
  DayOfWeekResult,
  GameModeDistResult,
  GameModeWinrateResult,
  GroupSizeResult,
  HeroMapSynergyResult,
  HeroPoolDiversityResult,
  HeroSwapResult,
  HeroWinrateResult,
  MapDetailedResult,
  MapFamiliarityResult,
  MapLearningResult,
  MapTimelineResult,
  MapWinLossResult,
  MatchData,
  MostPlayedHeroResult,
  OneTrickResult,
  PatchTimelineResult,
  RecentFormData,
  RepeatMapResult,
  RoleStatsResult,
  RollingWinrateResult,
  SeasonBreakdownEntry,
  SessionAnalysisResult,
  StreakData,
} from "@/lib/ranked-stats";
import type { OverwatchPatch } from "@/types/overwatch-patches";
const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary rounded-none bg-transparent px-0 pb-3 pt-1 font-mono text-[11px] tracking-[0.16em] uppercase shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary transition-colors";

const groupLabelClass =
  "text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase";

type DashboardTabsProps = {
  mapWinLoss: MapWinLossResult;
  gameModeDistribution: GameModeDistResult;
  gameModeWinrates: GameModeWinrateResult;
  mostPlayedHeroes: MostPlayedHeroResult;
  heroWinrates: HeroWinrateResult;
  matches: MatchData[];
  rollingWinrate: RollingWinrateResult;
  activityHeatmap: ActivityHeatmapResult;
  streakData: StreakData;
  recentForm: RecentFormData;
  groupSizeWinrates: GroupSizeResult;
  roleStats: RoleStatsResult;
  oneTrick: OneTrickResult;
  heroPoolDiversity: HeroPoolDiversityResult;
  heroSwapStats: HeroSwapResult;
  mapDetailedStats: MapDetailedResult;
  heroMapSynergy: HeroMapSynergyResult;
  mapLearningCurve: MapLearningResult;
  mapFamiliarity: MapFamiliarityResult;
  repeatMapData: RepeatMapResult;
  mapTimeline: MapTimelineResult;
  sessionAnalysis: SessionAnalysisResult;
  dayOfWeekStats: DayOfWeekResult;
  patchTimeline: PatchTimelineResult;
  seasonBreakdown: SeasonBreakdownEntry[];
  patches: OverwatchPatch[];
};

export function DashboardTabs({
  mapWinLoss,
  gameModeDistribution,
  gameModeWinrates,
  mostPlayedHeroes,
  heroWinrates,
  matches,
  rollingWinrate,
  activityHeatmap,
  streakData,
  recentForm,
  groupSizeWinrates,
  roleStats,
  oneTrick,
  heroPoolDiversity,
  heroSwapStats,
  mapDetailedStats,
  heroMapSynergy,
  mapLearningCurve,
  mapFamiliarity,
  repeatMapData,
  mapTimeline,
  sessionAnalysis,
  dayOfWeekStats,
  patchTimeline,
  seasonBreakdown,
  patches,
}: DashboardTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-8">
      <TabsList className="border-border h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b bg-transparent p-0">
        <TabsTrigger value="overview" className={tabTriggerClass}>
          Overview
        </TabsTrigger>
        <TabsTrigger value="heroes" className={tabTriggerClass}>
          Heroes
        </TabsTrigger>
        <TabsTrigger value="maps" className={tabTriggerClass}>
          Maps
        </TabsTrigger>
        <TabsTrigger value="time" className={tabTriggerClass}>
          Time
        </TabsTrigger>
        <TabsTrigger value="patches" className={tabTriggerClass}>
          Patches
        </TabsTrigger>
        <TabsTrigger value="groups" className={tabTriggerClass}>
          Groups
        </TabsTrigger>
        <TabsTrigger value="roles" className={tabTriggerClass}>
          Roles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-8">
        <MapWinLossChart result={mapWinLoss} />
        <div className="grid gap-4 md:grid-cols-2">
          <GameModeDistributionChart result={gameModeDistribution} />
          <GameModeWinrateChart result={gameModeWinrates} />
        </div>
      </TabsContent>

      <TabsContent value="heroes" className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          <MostPlayedHeroesChart result={mostPlayedHeroes} matches={matches} />
          <HeroWinrateChart result={heroWinrates} />
        </div>
        <p className={groupLabelClass}>Hero Deep Dives</p>
        <div className="grid gap-4 md:grid-cols-2">
          <OneTrickDetectionCard result={oneTrick} />
          <HeroPoolDiversityCard result={heroPoolDiversity} />
        </div>
        <HeroSwapAnalyticsChart result={heroSwapStats} />
      </TabsContent>

      <TabsContent value="maps" className="space-y-8">
        <MapWinrateRankingChart result={mapDetailedStats} />
        <div className="grid gap-4 md:grid-cols-2">
          <MapTierListCard result={mapDetailedStats} />
          <MapVolatilityCard result={mapDetailedStats} />
        </div>
        <p className={groupLabelClass}>
          Hero &times; Map Analysis
        </p>
        <HeroMapSynergyMatrix result={heroMapSynergy} />
        <BestHeroPerMapCard result={heroMapSynergy} />
        <p className={groupLabelClass}>Map Mastery</p>
        <div className="grid gap-4 md:grid-cols-2">
          <MapLearningCurveCard result={mapLearningCurve} />
          <MapTimelineCard result={mapTimeline} />
        </div>
        <p className={groupLabelClass}>Patterns</p>
        <div className="grid gap-4 md:grid-cols-2">
          <MapFamiliarityCard result={mapFamiliarity} />
          <RepeatMapCard result={repeatMapData} />
        </div>
      </TabsContent>

      <TabsContent value="time" className="space-y-8">
        <WinrateTrendChart result={rollingWinrate} />
        <div className="grid gap-4 md:grid-cols-2">
          <ActivityHeatmap result={activityHeatmap} />
          <StreakChart data={streakData} />
        </div>
        <RecentFormChart data={recentForm} />
        <div className="grid gap-4 md:grid-cols-2">
          <SessionAnalysisCard result={sessionAnalysis} />
          <DayOfWeekCard result={dayOfWeekStats} />
        </div>
      </TabsContent>

      <TabsContent value="patches" className="space-y-8">
        <PatchImpactChart
          timeline={patchTimeline}
          seasonBreakdown={seasonBreakdown}
          patches={patches}
        />
      </TabsContent>

      <TabsContent value="groups" className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          <GroupSizeWinrateChart result={groupSizeWinrates} />
          <GroupSizeBreakdownChart result={groupSizeWinrates} />
        </div>
      </TabsContent>

      <TabsContent value="roles" className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          <RoleDistributionChart result={roleStats} />
          <RoleWinrateChart result={roleStats} />
        </div>
        <RoleFlexibilityCard result={roleStats} />
      </TabsContent>
    </Tabs>
  );
}
