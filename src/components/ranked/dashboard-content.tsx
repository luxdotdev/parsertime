"use client";

import { useMemo, useState } from "react";
import { DashboardTabs } from "@/components/ranked/dashboard-tabs";
import { MatchForm } from "@/components/ranked/match-form";
import { MatchList } from "@/components/ranked/match-list";
import { SummaryCards } from "@/components/ranked/summary-cards";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildPatchPeriods,
  filterMatchesByPeriod,
  filterMatchesByRole,
  getActivityHeatmapData,
  getDayOfWeekStats,
  getGameModeDistribution,
  getGameModeWinrates,
  getGroupSizeWinrates,
  getHeroMapSynergy,
  getHeroPoolDiversity,
  getHeroSwapStats,
  getHeroWinrates,
  getMapDetailedStats,
  getMapFamiliarityData,
  getMapLearningCurve,
  getMapTimelineData,
  getMapWinLossData,
  getMostPlayedHeroes,
  getOneTrickStats,
  getPatchTimelineData,
  getRecentFormData,
  getRepeatMapData,
  getRollingWinrateData,
  getRoleStats,
  getSeasonBreakdown,
  getSessionAnalysis,
  getStreakData,
  getSummaryStats,
  type MatchData,
  type RoleFilter,
} from "@/lib/ranked-stats";
import type { OverwatchPatch } from "@/types/overwatch-patches";
import { CalendarRange, Heart, Plus, Shield, Swords } from "lucide-react";
import { useTranslations } from "next-intl";

type DashboardContentProps = {
  matches: MatchData[];
  patches: OverwatchPatch[];
};

const ROLE_OPTIONS: {
  value: RoleFilter;
  labelKey: string;
  icon: typeof Shield;
}[] = [
  { value: "all", labelKey: "roleAll", icon: Swords },
  { value: "Tank", labelKey: "roleTank", icon: Shield },
  { value: "Damage", labelKey: "roleDamage", icon: Swords },
  { value: "Support", labelKey: "roleSupport", icon: Heart },
];

export function DashboardContent({
  matches,
  patches,
}: DashboardContentProps) {
  const t = useTranslations("ranked.dashboard");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [periodId, setPeriodId] = useState<string>("all");

  const periods = useMemo(() => buildPatchPeriods(patches), [patches]);
  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === periodId) ?? null,
    [periods, periodId]
  );

  // Period scopes everything (all roles); role narrows it further. The Patches
  // tab uses the period-unscoped, role-filtered set so it always shows the full
  // patch history regardless of the active season filter.
  const periodMatches = useMemo(
    () => filterMatchesByPeriod(matches, selectedPeriod),
    [matches, selectedPeriod]
  );
  const filteredMatches = useMemo(
    () => filterMatchesByRole(periodMatches, roleFilter),
    [periodMatches, roleFilter]
  );
  const allTimeRoleMatches = useMemo(
    () => filterMatchesByRole(matches, roleFilter),
    [matches, roleFilter]
  );

  const patchTimeline = useMemo(
    () => getPatchTimelineData(allTimeRoleMatches),
    [allTimeRoleMatches]
  );
  const seasonBreakdown = useMemo(
    () => getSeasonBreakdown(allTimeRoleMatches, patches),
    [allTimeRoleMatches, patches]
  );

  const summaryStats = useMemo(
    () => getSummaryStats(filteredMatches),
    [filteredMatches]
  );
  const mapWinLoss = useMemo(
    () => getMapWinLossData(filteredMatches),
    [filteredMatches]
  );
  const gameModeDistribution = useMemo(
    () => getGameModeDistribution(filteredMatches),
    [filteredMatches]
  );
  const gameModeWinrates = useMemo(
    () => getGameModeWinrates(filteredMatches),
    [filteredMatches]
  );
  const mostPlayedHeroes = useMemo(
    () => getMostPlayedHeroes(filteredMatches),
    [filteredMatches]
  );
  const heroWinrates = useMemo(
    () => getHeroWinrates(filteredMatches),
    [filteredMatches]
  );
  const rollingWinrate = useMemo(
    () => getRollingWinrateData(filteredMatches),
    [filteredMatches]
  );
  const activityHeatmap = useMemo(
    () => getActivityHeatmapData(filteredMatches),
    [filteredMatches]
  );
  const streakData = useMemo(
    () => getStreakData(filteredMatches),
    [filteredMatches]
  );
  const recentForm = useMemo(
    () => getRecentFormData(filteredMatches),
    [filteredMatches]
  );
  const groupSizeWinrates = useMemo(
    () => getGroupSizeWinrates(filteredMatches),
    [filteredMatches]
  );
  const roleStats = useMemo(
    () => getRoleStats(periodMatches),
    [periodMatches]
  );
  const oneTrick = useMemo(
    () => getOneTrickStats(filteredMatches),
    [filteredMatches]
  );
  const heroPoolDiversity = useMemo(
    () => getHeroPoolDiversity(filteredMatches),
    [filteredMatches]
  );
  const heroSwapStats = useMemo(
    () => getHeroSwapStats(filteredMatches),
    [filteredMatches]
  );
  const mapDetailedStats = useMemo(
    () => getMapDetailedStats(filteredMatches),
    [filteredMatches]
  );
  const heroMapSynergy = useMemo(
    () => getHeroMapSynergy(filteredMatches),
    [filteredMatches]
  );
  const mapLearningCurve = useMemo(
    () => getMapLearningCurve(filteredMatches),
    [filteredMatches]
  );
  const mapFamiliarity = useMemo(
    () => getMapFamiliarityData(filteredMatches),
    [filteredMatches]
  );
  const repeatMapData = useMemo(
    () => getRepeatMapData(filteredMatches),
    [filteredMatches]
  );
  const mapTimeline = useMemo(
    () => getMapTimelineData(filteredMatches),
    [filteredMatches]
  );
  const sessionAnalysis = useMemo(
    () => getSessionAnalysis(filteredMatches),
    [filteredMatches]
  );
  const dayOfWeekStats = useMemo(
    () => getDayOfWeekStats(filteredMatches),
    [filteredMatches]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {periods.length > 0 && (
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger
              size="sm"
              aria-label={t("filterBySeason")}
              className="w-auto"
            >
              <CalendarRange className="size-4" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTime")}</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.kind === "mid-season" ? (
                    <span className="text-muted-foreground">↳</span>
                  ) : null}
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as RoleFilter)}
          >
            <SelectTrigger size="sm" aria-label={t("filterByRole")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <Icon className="size-4" aria-hidden="true" />
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MatchForm
            trigger={
              <Button className="active:scale-[0.97]">
                <Plus className="mr-1.5 size-4" />
                {t("trackMatch")}
              </Button>
            }
          />
        </div>
      </div>

      <SummaryCards stats={summaryStats} />

      <DashboardTabs
        mapWinLoss={mapWinLoss}
        gameModeDistribution={gameModeDistribution}
        gameModeWinrates={gameModeWinrates}
        mostPlayedHeroes={mostPlayedHeroes}
        heroWinrates={heroWinrates}
        matches={filteredMatches}
        rollingWinrate={rollingWinrate}
        activityHeatmap={activityHeatmap}
        streakData={streakData}
        recentForm={recentForm}
        groupSizeWinrates={groupSizeWinrates}
        roleStats={roleStats}
        oneTrick={oneTrick}
        heroPoolDiversity={heroPoolDiversity}
        heroSwapStats={heroSwapStats}
        mapDetailedStats={mapDetailedStats}
        heroMapSynergy={heroMapSynergy}
        mapLearningCurve={mapLearningCurve}
        mapFamiliarity={mapFamiliarity}
        repeatMapData={repeatMapData}
        mapTimeline={mapTimeline}
        sessionAnalysis={sessionAnalysis}
        dayOfWeekStats={dayOfWeekStats}
        patchTimeline={patchTimeline}
        seasonBreakdown={seasonBreakdown}
        patches={patches}
      />

      <MatchList matches={filteredMatches} />
    </div>
  );
}
