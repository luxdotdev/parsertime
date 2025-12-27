"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, toKebabCase } from "@/lib/utils";
import { Users } from "lucide-react";
import Image from "next/image";

type RosterVariant = {
  players: string[];
  wins: number;
  losses: number;
  winrate: number;
};

type MapRosterDetailsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  mapName: string;
  displayName: string;
  totalWins: number;
  totalLosses: number;
  totalWinrate: number;
  rosterVariants: RosterVariant[];
};

function getWinrateBadgeColor(winrate: number): string {
  if (winrate >= 70) return "bg-green-500/90";
  if (winrate >= 55) return "bg-green-400/90";
  if (winrate >= 45) return "bg-yellow-500/90";
  if (winrate >= 30) return "bg-orange-500/90";
  return "bg-red-500/90";
}

export function MapRosterDetailsSheet({
  isOpen,
  onClose,
  mapName,
  displayName,
  totalWins,
  totalLosses,
  totalWinrate,
  rosterVariants,
}: MapRosterDetailsSheetProps) {
  const sortedRosters = [...rosterVariants].sort(
    (a, b) => b.winrate - a.winrate
  );

  const totalGames = totalWins + totalLosses;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border">
              <Image
                src={`/maps/${toKebabCase(mapName)}.webp`}
                alt={displayName}
                fill
                className="object-cover"
              />
            </div>
            {displayName}
          </SheetTitle>
          <SheetDescription>
            Overall: {totalWins}W - {totalLosses}L ({totalWinrate.toFixed(1)}%
            winrate) • {totalGames} {totalGames === 1 ? "game" : "games"} played
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {sortedRosters.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No roster data available for this map yet.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="font-semibold">
                  Roster Performance ({sortedRosters.length}{" "}
                  {sortedRosters.length === 1 ? "lineup" : "lineups"})
                </h3>
              </div>

              <div className="space-y-3">
                {sortedRosters.map((roster, index) => {
                  const games = roster.wins + roster.losses;
                  const isBestRoster = index === 0;

                  return (
                    <div
                      key={roster.players.join(",")}
                      className={cn(
                        "rounded-lg border p-4 transition-colors",
                        isBestRoster
                          ? "border-green-500 bg-green-500/5"
                          : "bg-card hover:bg-accent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          {/* Roster Badge */}
                          {isBestRoster && (
                            <Badge className="bg-green-500 text-white">
                              Best Lineup
                            </Badge>
                          )}

                          {/* Players */}
                          <div className="flex flex-wrap gap-2">
                            {roster.players.map((player) => (
                              <span
                                key={player}
                                className="bg-muted rounded-md px-2 py-1 text-sm font-medium"
                              >
                                {player}
                              </span>
                            ))}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {roster.wins}W - {roster.losses}L
                            </span>
                            <span className="text-muted-foreground">
                              {games} {games === 1 ? "game" : "games"}
                            </span>
                          </div>
                        </div>

                        {/* Winrate */}
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={cn(
                              "px-3 py-1 text-base font-bold text-white",
                              getWinrateBadgeColor(roster.winrate)
                            )}
                          >
                            {roster.winrate.toFixed(1)}%
                          </Badge>
                          {games < 5 && (
                            <span className="text-muted-foreground text-xs">
                              Small sample
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
