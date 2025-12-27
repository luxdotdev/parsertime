"use client";

import { MapRosterDetailsSheet } from "@/components/stats/team/map-roster-details-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { $Enums } from "@prisma/client";
import { Search, X } from "lucide-react";
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

function getWinrateColor(winrate: number): string {
  if (winrate >= 70) return "bg-green-500/90";
  if (winrate >= 55) return "bg-green-400/90";
  if (winrate >= 45) return "bg-yellow-500/90";
  if (winrate >= 30) return "bg-orange-500/90";
  return "bg-red-500/90";
}

function getWinrateBorderColor(winrate: number): string {
  if (winrate >= 70) return "border-green-500";
  if (winrate >= 55) return "border-green-400";
  if (winrate >= 45) return "border-yellow-500";
  if (winrate >= 30) return "border-orange-500";
  return "border-red-500";
}

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
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("winrate");
  const [filterMapType, setFilterMapType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const mapEntries = Object.entries(winrates);

  // Get unique map types
  const availableMapTypes = useMemo(() => {
    const types = new Set<$Enums.MapType>();
    mapEntries.forEach(([mapName]) => {
      const mapType = getMapType(mapName);
      if (mapType) types.add(mapType);
    });
    return Array.from(types).sort();
  }, [mapEntries]);

  // Filter and sort maps
  const filteredAndSortedMaps = useMemo(() => {
    let filtered = mapEntries;

    // Apply map type filter
    if (filterMapType !== "all") {
      filtered = filtered.filter(([mapName]) => {
        const mapType = getMapType(mapName);
        return mapType === filterMapType;
      });
    }

    // Apply search filter
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

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const [mapNameA, dataA] = a;
      const [mapNameB, dataB] = b;

      switch (sortBy) {
        case "winrate":
          return dataB.totalWinrate - dataA.totalWinrate;
        case "playtime": {
          // Guard against undefined mapPlaytimes
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

  if (mapEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Map Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No map data available yet. Play some matches to see your team&apos;s
            map performance!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Map Filters</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Maps</Label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="search"
                    placeholder="Search map names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Map Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="map-type">Map Type</Label>
                <Select value={filterMapType} onValueChange={setFilterMapType}>
                  <SelectTrigger id="map-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {availableMapTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <Label htmlFor="sort">Sort By</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortOption)}
                >
                  <SelectTrigger id="sort">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="winrate">Highest Winrate</SelectItem>
                    <SelectItem
                      value="playtime"
                      disabled={
                        !mapPlaytimes || Object.keys(mapPlaytimes).length === 0
                      }
                    >
                      Most Played
                    </SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            Showing {filteredAndSortedMaps.length} of {mapEntries.length} maps
          </span>
          {filterMapType !== "all" && (
            <Badge variant="secondary">{filterMapType}</Badge>
          )}
        </div>

        {/* Map Grid */}
        {filteredAndSortedMaps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No maps match your current filters. Try adjusting your search or
                filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAndSortedMaps.map(([mapName, data]) => {
              const totalGames = data.totalWins + data.totalLosses;
              const winrate = data.totalWinrate;
              const kebabName = toKebabCase(mapName);
              const mapType = getMapType(mapName);

              return (
                <Card
                  key={mapName}
                  onClick={() => handleMapClick(mapName)}
                  className={cn(
                    "group relative h-48 cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-lg",
                    getWinrateBorderColor(winrate)
                  )}
                >
                  <Image
                    src={`/maps/${kebabName}.webp`}
                    alt={mapNames.get(kebabName) ?? mapName}
                    fill
                    className="object-cover brightness-[0.4] transition-all group-hover:brightness-[0.5]"
                  />

                  {/* Map Type Badge */}
                  {mapType && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge variant="secondary" className="text-xs">
                        {mapType}
                      </Badge>
                    </div>
                  )}

                  {/* Map Name */}
                  <div className="absolute bottom-16 left-4 z-10">
                    <h3 className="text-lg font-bold text-white drop-shadow-lg">
                      {mapNames.get(kebabName) ?? mapName}
                    </h3>
                  </div>

                  {/* Winrate Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <Badge
                      className={cn(
                        "px-3 py-1 text-lg font-bold text-white",
                        getWinrateColor(winrate)
                      )}
                    >
                      {winrate.toFixed(1)}%
                    </Badge>
                  </div>

                  {/* Stats at bottom */}
                  <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
                    <div className="flex items-center justify-between text-sm text-white">
                      <div className="flex gap-3">
                        <span className="font-semibold">{data.totalWins}W</span>
                        <span className="font-semibold">
                          {data.totalLosses}L
                        </span>
                      </div>
                      <span className="text-xs text-white/70">
                        {totalGames} {totalGames === 1 ? "game" : "games"}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-muted-foreground text-center text-sm">
          Click on any map to see roster performance details
        </p>
      </div>

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
