"use client";

import { MapRosterDetailsSheet } from "@/components/stats/team/map-roster-details-sheet";
import { SectionHeader } from "@/components/stats/team/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, toKebabCase } from "@/lib/utils";
import { mapNameToMapTypeMapping } from "@/types/map";
import type { $Enums } from "@/generated/prisma/browser";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

type RosterVariant = {
  players: string[];
  wins: number;
  losses: number;
  winrate: number;
};

type MapWinrateGalleryProps = {
  winrates: Record<
    string,
    {
      mapName: string;
      totalWins: number;
      totalLosses: number;
      totalWinrate: number;
      rosterVariants: RosterVariant[];
    }
  >;
  mapPlaytimes: Record<string, number>;
  mapNames: Map<string, string>;
};

type SortOption = "winrate" | "playtime" | "alphabetical";

function getMapType(mapName: string): $Enums.MapType | null {
  return (
    mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping] ??
    null
  );
}

export function MapWinrateGallery({
  winrates,
  mapPlaytimes,
  mapNames,
}: MapWinrateGalleryProps) {
  const t = useTranslations("teamStatsPage.mapWinrateGallery");

  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("winrate");
  const [filterMapType, setFilterMapType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const mapEntries = Object.entries(winrates);

  const availableMapTypes = useMemo(() => {
    const types = new Set<$Enums.MapType>();
    mapEntries.forEach(([mapName]) => {
      const mapType = getMapType(mapName);
      if (mapType) types.add(mapType);
    });
    return Array.from(types).sort();
  }, [mapEntries]);

  const filteredAndSortedMaps = useMemo(() => {
    let filtered = mapEntries;

    if (filterMapType !== "all") {
      filtered = filtered.filter(([mapName]) => {
        const mapType = getMapType(mapName);
        return mapType === filterMapType;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(([mapName]) => {
        const displayName = mapNames.get(toKebabCase(mapName)) ?? mapName;
        return (
          mapName.toLowerCase().includes(query) ||
          displayName.toLowerCase().includes(query)
        );
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      const [mapNameA, dataA] = a;
      const [mapNameB, dataB] = b;

      switch (sortBy) {
        case "winrate":
          return dataB.totalWinrate - dataA.totalWinrate;
        case "playtime": {
          if (!mapPlaytimes) return 0;
          const playtimeA = mapPlaytimes[mapNameA] ?? 0;
          const playtimeB = mapPlaytimes[mapNameB] ?? 0;
          return playtimeB - playtimeA;
        }
        case "alphabetical":
          const nameA = mapNames.get(toKebabCase(mapNameA)) ?? mapNameA;
          const nameB = mapNames.get(toKebabCase(mapNameB)) ?? mapNameB;
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return sorted;
  }, [mapEntries, filterMapType, searchQuery, sortBy, mapNames, mapPlaytimes]);

  const leaderMapName = useMemo(() => {
    let topName: string | null = null;
    let topWinrate = -1;
    for (const [mapName, data] of mapEntries) {
      if (data.totalWinrate > topWinrate) {
        topWinrate = data.totalWinrate;
        topName = mapName;
      }
    }
    return topName;
  }, [mapEntries]);

  function handleMapClick(mapName: string) {
    setSelectedMap(mapName);
    setIsSheetOpen(true);
  }

  function handleCloseSheet() {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedMap(null), 300);
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterMapType("all");
    setSortBy("winrate");
  }

  const selectedMapData = selectedMap ? winrates[selectedMap] : null;
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterMapType !== "all" ||
    sortBy !== "winrate";

  function formatMapType(mapType: $Enums.MapType) {
    return t(`mapTypes.${mapType}`);
  }

  if (mapEntries.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const filtersRightSlot = hasActiveFilters ? (
    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
      <X className="mr-2 h-4 w-4" />
      {t("clearFilters")}
    </Button>
  ) : null;

  return (
    <>
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          rightSlot={filtersRightSlot}
        />

        <div className="border-border grid gap-4 border-y py-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="search">{t("searchMaps")}</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="search"
                placeholder={t("searchMapNames")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="map-type">{t("mapType")}</Label>
            <Select value={filterMapType} onValueChange={setFilterMapType}>
              <SelectTrigger id="map-type">
                <SelectValue placeholder={t("allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                {availableMapTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatMapType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort">{t("sortBy")}</Label>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger id="sort">
                <SelectValue placeholder={t("sortByPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="winrate">{t("highestWinrate")}</SelectItem>
                <SelectItem
                  value="playtime"
                  disabled={
                    !mapPlaytimes || Object.keys(mapPlaytimes).length === 0
                  }
                >
                  {t("mostPlayed")}
                </SelectItem>
                <SelectItem value="alphabetical">
                  {t("alphabetical")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {t("showingMaps", {
              count: filteredAndSortedMaps.length,
              total: mapEntries.length,
            })}
          </span>
          {filterMapType !== "all" && (
            <Badge variant="secondary">
              {formatMapType(filterMapType as $Enums.MapType)}
            </Badge>
          )}
        </div>

        {filteredAndSortedMaps.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {t("noMapsMatchFilters")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAndSortedMaps.map(([mapName, data]) => {
              const totalGames = data.totalWins + data.totalLosses;
              const winrate = data.totalWinrate;
              const kebabName = toKebabCase(mapName);
              const mapType = getMapType(mapName);
              const isLeader = leaderMapName === mapName;

              return (
                <Card
                  key={mapName}
                  onClick={() => handleMapClick(mapName)}
                  className="bg-card border-border group relative h-48 cursor-pointer overflow-hidden rounded-md border transition-all hover:scale-105 hover:shadow-lg"
                >
                  <Image
                    src={`/maps/${kebabName}.webp`}
                    alt={mapNames.get(kebabName) ?? mapName}
                    fill
                    className="object-cover brightness-[0.4] transition-all group-hover:brightness-[0.5]"
                  />

                  {mapType && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-muted text-muted-foreground rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                        {formatMapType(mapType)}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-16 left-4 z-10">
                    <h3 className="text-lg font-bold text-white drop-shadow-lg">
                      {mapNames.get(kebabName) ?? mapName}
                    </h3>
                  </div>

                  <div className="absolute top-4 right-4 z-10">
                    <span
                      className={cn(
                        "rounded-sm px-2 py-0.5 font-mono text-[11px] tracking-[0.16em] uppercase tabular-nums",
                        isLeader
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {winrate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
                    <div className="flex items-center justify-between text-sm text-white">
                      <div className="flex gap-3 font-mono tabular-nums">
                        <span className="font-semibold">
                          {t("winsShort", { count: data.totalWins })}
                        </span>
                        <span className="font-semibold">
                          {t("lossesShort", { count: data.totalLosses })}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-white/70 tabular-nums">
                        {t("gamesLabel", { count: totalGames })}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-muted-foreground text-center text-sm">
          {t("clickToSeeRosterPerformance")}
        </p>
      </section>

      {selectedMapData && (
        <MapRosterDetailsSheet
          isOpen={isSheetOpen}
          onClose={handleCloseSheet}
          mapName={selectedMap!}
          displayName={mapNames.get(toKebabCase(selectedMap!)) ?? selectedMap!}
          totalWins={selectedMapData.totalWins}
          totalLosses={selectedMapData.totalLosses}
          totalWinrate={selectedMapData.totalWinrate}
          rosterVariants={selectedMapData.rosterVariants}
        />
      )}
    </>
  );
}
