"use client";

import { HeroFilter } from "@/components/stats/player/hero-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeroName } from "@/types/heroes";
import { RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PlayerSelector } from "./player-selector";

type ComparisonFiltersProps = {
  teamId: number;
  mapIds: number[];
  selectedPlayer: string | null;
  selectedHeroes: HeroName[];
  dateRange?: { from: Date; to: Date };
  onPlayerChange: (player: string | null) => void;
  onHeroesChange: (heroes: HeroName[]) => void;
  onDateRangeChange: (range: { from: Date; to: Date } | undefined) => void;
};

export function ComparisonFilters({
  teamId,
  mapIds,
  selectedPlayer,
  selectedHeroes,
  onPlayerChange,
  onHeroesChange,
}: ComparisonFiltersProps) {
  const t = useTranslations("comparePage.filters");

  const hasActiveFilters = useMemo(() => {
    return selectedPlayer !== null || selectedHeroes.length > 0;
  }, [selectedPlayer, selectedHeroes]);

  function handleReset() {
    onPlayerChange(null);
    onHeroesChange([]);
  }

  return (
    <Card className="sticky top-0 z-10">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("title")}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("resetAll")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
          {/* Player Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("playerLabel")}
              <span className="text-destructive ml-1">*</span>
            </label>
            <PlayerSelector
              teamId={teamId}
              mapIds={mapIds}
              value={selectedPlayer}
              onChange={onPlayerChange}
            />
          </div>

          {/* Hero Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("heroesLabel")}</label>
            <HeroFilter
              selectedHeroes={selectedHeroes}
              onSelectionChange={onHeroesChange}
            />
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedPlayer && (
              <Badge variant="secondary" className="gap-1">
                {t("player")}: {selectedPlayer}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onPlayerChange(null)}
                />
              </Badge>
            )}
            {selectedHeroes.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                {selectedHeroes.length === 1
                  ? selectedHeroes[0]
                  : t("heroesCount", { count: selectedHeroes.length })}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onHeroesChange([])}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
