"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HeroName } from "@/types/heroes";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChartsView } from "./charts-view";
import { ComparisonFilters } from "./comparison-filters";
import { DeltaView } from "./delta-view";
import { EmptyState } from "./empty-state";
import { SideBySideView } from "./side-by-side-view";
import { TrendsView } from "./trends-view";

type ComparisonContentProps = {
  teamId: number;
  locale: string;
};

type ViewMode = "side-by-side" | "delta" | "trends" | "charts";

type ComparisonStats = {
  playerName: string;
  filteredHeroes: HeroName[];
  mapCount: number;
  mapIds: number[];
  aggregated: {
    eliminations: number;
    deaths: number;
    damage: number;
    healing: number;
    mitigated: number;
    heroTimePlayed: number;
    eliminationsPer10: number;
    deathsPer10: number;
    damagePer10: number;
    healingPer10: number;
    mitigatedPer10: number;
  };
  perMapBreakdown: {
    mapId: number;
    mapName: string;
    date: Date;
    heroes: HeroName[];
    stats: Record<string, number>;
  }[];
  trends?: {
    improvingMetrics: string[];
    decliningMetrics: string[];
    earlyPerformance?: Record<string, number>;
    latePerformance?: Record<string, number>;
  };
  heroBreakdown?: Record<string, Record<string, number>>;
};

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

export function ComparisonContent({ teamId }: ComparisonContentProps) {
  const t = useTranslations("comparePage");
  const searchParams = useSearchParams();

  // Get map IDs from URL
  const mapsParam = searchParams.get("maps");
  const selectedMapIds = mapsParam
    ? mapsParam.split(",").map((id) => parseInt(id, 10))
    : [];

  // Filter state
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedHeroes, setSelectedHeroes] = useState<HeroName[]>([]);
  const [dateRange, setDateRange] = useState<
    { from: Date; to: Date } | undefined
  >(undefined);

  // View mode state
  const [activeView, setActiveView] = useState<ViewMode>("side-by-side");

  // Fetch comparison stats
  const { data: comparisonStats, isLoading } = useQuery({
    queryKey: [
      "comparisonStats",
      selectedMapIds,
      selectedPlayer,
      selectedHeroes,
    ],
    queryFn: () =>
      fetchComparisonStats(
        selectedMapIds,
        selectedPlayer!,
        selectedHeroes.length > 0 ? selectedHeroes : undefined
      ),
    enabled: selectedMapIds.length > 0 && !!selectedPlayer,
    staleTime: 5 * 60 * 1000,
  });

  // Determine available views based on map count
  const availableViews: ViewMode[] = useMemo(() => {
    return selectedMapIds.length === 2
      ? ["side-by-side", "delta", "charts"]
      : selectedMapIds.length >= 3
        ? ["trends", "charts"]
        : [];
  }, [selectedMapIds.length]);

  // Auto-switch view when map selection changes
  useEffect(() => {
    if (availableViews.length > 0 && !availableViews.includes(activeView)) {
      setActiveView(availableViews[0]);
    }
  }, [availableViews, activeView]);

  // Empty state when no maps selected
  if (selectedMapIds.length === 0) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>

        <EmptyState
          icon="MapPin"
          title={t("emptyStates.noMaps.title")}
          description={t("emptyStates.noMaps.description")}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground mt-2">
          {t("comparingMaps", { count: selectedMapIds.length })}
        </p>
      </div>

      {/* Filters */}
      <ComparisonFilters
        teamId={teamId}
        selectedPlayer={selectedPlayer}
        selectedHeroes={selectedHeroes}
        dateRange={dateRange}
        onPlayerChange={setSelectedPlayer}
        onHeroesChange={setSelectedHeroes}
        onDateRangeChange={setDateRange}
      />

      {/* Content */}
      {!selectedPlayer ? (
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
      ) : !comparisonStats ? (
        <EmptyState
          icon="TrendingDown"
          title={t("emptyStates.noData.title")}
          description={t("emptyStates.noData.description", {
            player: selectedPlayer,
          })}
        />
      ) : (
        <Tabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as ViewMode)}
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 lg:grid-cols-4">
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
          </TabsList>

          {availableViews.includes("side-by-side") && (
            <TabsContent value="side-by-side">
              <SideBySideView stats={comparisonStats} />
            </TabsContent>
          )}

          {availableViews.includes("delta") && (
            <TabsContent value="delta">
              <DeltaView stats={comparisonStats} />
            </TabsContent>
          )}

          {availableViews.includes("trends") && (
            <TabsContent value="trends">
              <TrendsView stats={comparisonStats} />
            </TabsContent>
          )}

          {availableViews.includes("charts") && (
            <TabsContent value="charts">
              <ChartsView
                stats={comparisonStats}
                viewMode={selectedMapIds.length === 2 ? "two-map" : "multi-map"}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
