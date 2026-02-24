"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ComparisonStats } from "@/data/comparison-dto";
import type { HeroName } from "@/types/heroes";
import type { FormattedMapGroup } from "@/types/map-group";
import type { TeamComparisonStats } from "@/types/team-comparison";
import { useQuery } from "@tanstack/react-query";
import { FolderCog, Loader2 } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChartsView } from "./charts-view";
import { ComparisonFilters } from "./comparison-filters";
import { ConsistencyView } from "./consistency-view";
import { DeltaView } from "./delta-view";
import { DetailedStatsView } from "./detailed-stats-view";
import { EmptyState } from "./empty-state";
import { ImpactMetricsView } from "./impact-metrics-view";
import { MapGroupComparisonSelector } from "./map-group-comparison-selector";
import { MapGroupSelector } from "./map-group-selector";
import { SideBySideView } from "./side-by-side-view";
import { TeamComparisonView } from "./team-comparison-view";
import { TrendsView } from "./trends-view";

type ComparisonContentProps = {
  teamId: number;
  locale: string;
};

type ViewMode =
  | "side-by-side"
  | "delta"
  | "trends"
  | "charts"
  | "consistency"
  | "detailed-stats"
  | "impact-metrics";
type ComparisonMode = "player" | "team";
type MapSelectionMode = "individual" | "groups";

async function fetchComparisonStats(
  mapIds: number[],
  playerName: string,
  heroes?: HeroName[]
): Promise<ComparisonStats> {
  const params = new URLSearchParams({
    mapIds: JSON.stringify(mapIds),
    playerName,
  });

  if (heroes && heroes.length > 0) {
    params.set("heroes", heroes.join(","));
  }

  const response = await fetch(`/api/compare/stats?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch comparison stats");
  }

  const data = (await response.json()) as { data: ComparisonStats };
  return data.data;
}

async function fetchTeamComparisonStats(
  mapIds: number[],
  teamId: number,
  heroes?: HeroName[]
): Promise<TeamComparisonStats> {
  const params = new URLSearchParams({
    mapIds: JSON.stringify(mapIds),
    teamId: teamId.toString(),
  });

  if (heroes && heroes.length > 0) {
    params.set("heroes", heroes.join(","));
  }

  const response = await fetch(
    `/api/compare/team-vs-team?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch team comparison stats");
  }

  const data = (await response.json()) as { data: TeamComparisonStats };
  return data.data;
}

async function fetchMapGroups(teamId: number): Promise<FormattedMapGroup[]> {
  const response = await fetch(`/api/compare/map-groups?teamId=${teamId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch map groups");
  }
  const data = (await response.json()) as {
    success: boolean;
    groups: FormattedMapGroup[];
  };
  return data.groups;
}

export function ComparisonContent({ teamId }: ComparisonContentProps) {
  const t = useTranslations("comparePage");
  const searchParams = useSearchParams();

  // Get map IDs from URL - memoize to prevent useMemo dependency issues
  const selectedMapIds = useMemo(() => {
    const mapsParam = searchParams.get("maps");
    return mapsParam ? mapsParam.split(",").map((id) => parseInt(id, 10)) : [];
  }, [searchParams]);

  // Filter state
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedHeroes, setSelectedHeroes] = useState<HeroName[]>([]);
  const [dateRange, setDateRange] = useState<
    { from: Date; to: Date } | undefined
  >(undefined);

  // Comparison mode state (player vs team)
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>("player");

  // Map selection mode state (individual maps vs map groups)
  const [mapSelectionMode, setMapSelectionMode] =
    useState<MapSelectionMode>("individual");
  const [selectedMapGroups, setSelectedMapGroups] = useState<number[]>([]);

  // View mode state
  const [activeView, setActiveView] = useState<ViewMode>("side-by-side");

  // Fetch map groups to resolve group IDs to map IDs
  const { data: mapGroups } = useQuery({
    queryKey: ["mapGroups", teamId],
    queryFn: () => fetchMapGroups(teamId),
    staleTime: 5 * 60 * 1000,
    enabled: mapSelectionMode === "groups",
  });

  // Calculate effective map IDs based on selection mode
  const effectiveMapIds = useMemo(() => {
    if (mapSelectionMode === "individual") {
      return selectedMapIds;
    }

    // In groups mode, combine all map IDs from selected groups
    if (!mapGroups || selectedMapGroups.length === 0) {
      return [];
    }

    const mapIdsSet = new Set<number>();
    selectedMapGroups.forEach((groupId) => {
      const group = mapGroups.find((g) => g.id === groupId);
      if (group) {
        group.mapIds.forEach((mapId) => mapIdsSet.add(mapId));
      }
    });

    return Array.from(mapIdsSet);
  }, [mapSelectionMode, selectedMapIds, selectedMapGroups, mapGroups]);

  // Fetch comparison stats (player mode)
  const { data: comparisonStats, isLoading: isLoadingPlayer } = useQuery({
    queryKey: [
      "comparisonStats",
      effectiveMapIds,
      selectedPlayer,
      selectedHeroes,
    ],
    queryFn: () =>
      fetchComparisonStats(
        effectiveMapIds,
        selectedPlayer!,
        selectedHeroes.length > 0 ? selectedHeroes : undefined
      ),
    enabled:
      comparisonMode === "player" &&
      effectiveMapIds.length > 0 &&
      !!selectedPlayer,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch team comparison stats (team mode)
  const { data: teamComparisonStats, isLoading: isLoadingTeam } = useQuery({
    queryKey: ["teamComparisonStats", effectiveMapIds, teamId, selectedHeroes],
    queryFn: () =>
      fetchTeamComparisonStats(
        effectiveMapIds,
        teamId,
        selectedHeroes.length > 0 ? selectedHeroes : undefined
      ),
    enabled: comparisonMode === "team" && effectiveMapIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    comparisonMode === "player" ? isLoadingPlayer : isLoadingTeam;

  // Determine available views based on map count and comparison mode
  const availableViews: ViewMode[] = useMemo(() => {
    // Team comparison doesn't support all views
    if (comparisonMode === "team") {
      return effectiveMapIds.length >= 2 ? ["side-by-side"] : [];
    }

    // Player comparison views
    if (effectiveMapIds.length === 2) {
      return [
        "side-by-side",
        "delta",
        "charts",
        "consistency",
        "detailed-stats",
        "impact-metrics",
      ];
    } else if (effectiveMapIds.length >= 3) {
      return [
        "trends",
        "charts",
        "consistency",
        "detailed-stats",
        "impact-metrics",
      ];
    }
    return [];
  }, [effectiveMapIds.length, comparisonMode]);

  // Auto-switch view when map selection or comparison mode changes
  useEffect(() => {
    if (availableViews.length > 0 && !availableViews.includes(activeView)) {
      setActiveView(availableViews[0]);
    }
  }, [availableViews, activeView]);

  // Empty state when no maps selected (considering both modes)
  if (effectiveMapIds.length === 0) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>

        {mapSelectionMode === "groups" ? (
          <EmptyState
            icon="MapPin"
            title={t("emptyStates.noMapGroups.title")}
            description={t("emptyStates.noMapGroups.description")}
          >
            <MapGroupComparisonSelector
              teamId={teamId}
              onSelect={(groupIds) => {
                setSelectedMapGroups(groupIds);
              }}
            />
          </EmptyState>
        ) : (
          <EmptyState
            icon="MapPin"
            title={t("emptyStates.noMaps.title")}
            description={t("emptyStates.noMaps.description")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground mt-2">
          {effectiveMapIds.length > 0
            ? t("comparingMaps", { count: effectiveMapIds.length })
            : t("subtitle")}
        </p>
      </div>

      {/* Map Selection Mode Toggle */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="map-selection-mode"
                className="text-base font-medium"
              >
                {t("mapSelectionMode.label")}
              </Label>
              <p className="text-muted-foreground text-sm">
                {mapSelectionMode === "individual"
                  ? t("mapSelectionMode.individualDescription")
                  : t("mapSelectionMode.groupsDescription")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium transition-colors ${
                  mapSelectionMode === "individual"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {t("mapSelectionMode.individual")}
              </span>
              <Switch
                id="map-selection-mode"
                checked={mapSelectionMode === "groups"}
                onCheckedChange={(checked) =>
                  setMapSelectionMode(checked ? "groups" : "individual")
                }
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  mapSelectionMode === "groups"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {t("mapSelectionMode.groups")}
              </span>
            </div>
          </div>

          {/* Map Group Selector (only show in groups mode) */}
          {mapSelectionMode === "groups" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm leading-none font-medium">
                  {t("mapSelectionMode.selectGroups")}
                </Label>
                <Link
                  href={`/${teamId}/map-groups` as Route}
                  className="text-primary flex items-center gap-1 text-xs hover:underline"
                >
                  <FolderCog className="h-3 w-3" />
                  {t("mapSelectionMode.manageGroups")}
                </Link>
              </div>
              <MapGroupSelector
                teamId={teamId}
                value={selectedMapGroups}
                onChange={setSelectedMapGroups}
                multiSelect
                placeholder={t("mapSelectionMode.selectGroupsPlaceholder")}
              />
              <p className="text-muted-foreground text-xs">
                {t("mapSelectionMode.groupsHint")}
              </p>
            </div>
          )}

          {/* Individual Maps Info (only show in individual mode with selected maps) */}
          {mapSelectionMode === "individual" && selectedMapIds.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground text-sm">
                {t("mapSelectionMode.individualMapsSelected", {
                  count: selectedMapIds.length,
                })}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Filters */}
      <div className="space-y-4">
        {/* Comparison Mode Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="comparison-mode"
                className="text-base font-medium"
              >
                {t("comparisonMode.label")}
              </Label>
              <p className="text-muted-foreground text-sm">
                {comparisonMode === "player"
                  ? t("comparisonMode.playerDescription")
                  : t("comparisonMode.teamDescription")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium transition-colors ${
                  comparisonMode === "player"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {t("comparisonMode.player")}
              </span>
              <Switch
                id="comparison-mode"
                checked={comparisonMode === "team"}
                onCheckedChange={(checked) =>
                  setComparisonMode(checked ? "team" : "player")
                }
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  comparisonMode === "team"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {t("comparisonMode.team")}
              </span>
            </div>
          </div>
        </Card>

        {/* Player Filters (only show in player mode) */}
        {comparisonMode === "player" && (
          <ComparisonFilters
            teamId={teamId}
            mapIds={effectiveMapIds}
            selectedPlayer={selectedPlayer}
            selectedHeroes={selectedHeroes}
            dateRange={dateRange}
            onPlayerChange={setSelectedPlayer}
            onHeroesChange={setSelectedHeroes}
            onDateRangeChange={setDateRange}
          />
        )}
      </div>

      {/* Content */}
      {comparisonMode === "player" && !selectedPlayer ? (
        <EmptyState
          icon="UserX"
          title={t("emptyStates.noPlayer.title")}
          description={t("emptyStates.noPlayer.description")}
        />
      ) : isLoading ? (
        <Card className="flex h-[400px] items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg">{t("loading")}</span>
          </div>
        </Card>
      ) : comparisonMode === "player" && !comparisonStats ? (
        <EmptyState
          icon="TrendingDown"
          title={t("emptyStates.noData.title")}
          description={t("emptyStates.noData.description", {
            player: selectedPlayer ?? "Unknown Player",
          })}
        />
      ) : comparisonMode === "team" && !teamComparisonStats ? (
        <EmptyState
          icon="TrendingDown"
          title={t("emptyStates.noData.title")}
          description={t("emptyStates.noTeamData.description")}
        />
      ) : comparisonMode === "team" ? (
        <TeamComparisonView stats={teamComparisonStats!} />
      ) : (
        <Tabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as ViewMode)}
        >
          <TabsList>
            {availableViews.includes("side-by-side") && (
              <TabsTrigger value="side-by-side">
                {t("views.sideBySide")}
              </TabsTrigger>
            )}
            {availableViews.includes("delta") && (
              <TabsTrigger value="delta">{t("views.delta")}</TabsTrigger>
            )}
            {availableViews.includes("trends") && (
              <TabsTrigger value="trends">{t("views.trends")}</TabsTrigger>
            )}
            {availableViews.includes("charts") && (
              <TabsTrigger value="charts">{t("views.charts")}</TabsTrigger>
            )}
            {availableViews.includes("consistency") && (
              <TabsTrigger value="consistency">
                {t("views.consistency")}
              </TabsTrigger>
            )}
            {availableViews.includes("detailed-stats") && (
              <TabsTrigger value="detailed-stats">
                {t("views.detailedStats")}
              </TabsTrigger>
            )}
            {availableViews.includes("impact-metrics") && (
              <TabsTrigger value="impact-metrics">
                {t("views.impactMetrics")}
              </TabsTrigger>
            )}
          </TabsList>

          {availableViews.includes("side-by-side") && (
            <TabsContent value="side-by-side">
              <SideBySideView stats={comparisonStats!} />
            </TabsContent>
          )}

          {availableViews.includes("delta") && (
            <TabsContent value="delta">
              <DeltaView stats={comparisonStats!} />
            </TabsContent>
          )}

          {availableViews.includes("trends") && (
            <TabsContent value="trends">
              <TrendsView stats={comparisonStats!} />
            </TabsContent>
          )}

          {availableViews.includes("charts") && (
            <TabsContent value="charts">
              <ChartsView
                stats={comparisonStats!}
                viewMode={
                  effectiveMapIds.length === 2 ? "two-map" : "multi-map"
                }
              />
            </TabsContent>
          )}

          {availableViews.includes("consistency") && (
            <TabsContent value="consistency">
              <ConsistencyView stats={comparisonStats!} />
            </TabsContent>
          )}

          {availableViews.includes("detailed-stats") && (
            <TabsContent value="detailed-stats">
              <DetailedStatsView stats={[comparisonStats!]} />
            </TabsContent>
          )}

          {availableViews.includes("impact-metrics") && (
            <TabsContent value="impact-metrics">
              <ImpactMetricsView stats={[comparisonStats!]} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
