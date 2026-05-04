"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, toKebabCase } from "@/lib/utils";
import { useTranslations } from "next-intl";
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

function winrateClass(winrate: number, hasGames: boolean): string {
  if (!hasGames) return "text-muted-foreground";
  if (winrate >= 60) return "text-primary";
  if (winrate <= 40) return "text-destructive";
  return "text-foreground";
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
  const t = useTranslations("teamStatsPage.mapRosterDetailsSheet");

  const sortedRosters = [...rosterVariants].sort(
    (a, b) => b.winrate - a.winrate
  );

  const totalGames = totalWins + totalLosses;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-2xl">
        <SheetHeader className="space-y-3 p-0">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            Maps · Roster breakdown
          </p>
          <SheetTitle className="flex items-center gap-4 text-2xl tracking-tight">
            <div className="border-border relative h-12 w-12 shrink-0 overflow-hidden rounded border">
              <Image
                src={`/maps/${toKebabCase(mapName)}.webp`}
                alt={displayName}
                fill
                className="object-cover"
              />
            </div>
            {displayName}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("overall", {
              wins: totalWins,
              losses: totalLosses,
              winrate: totalWinrate.toFixed(1),
              games: totalGames,
            })}
          </SheetDescription>
        </SheetHeader>

        <dl className="border-border mt-4 grid grid-cols-3 divide-x divide-[var(--border)] border-y">
          <div className="flex flex-col gap-1 px-4 py-3">
            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              Record
            </dt>
            <dd className="text-foreground font-mono text-xl leading-none font-semibold tabular-nums">
              {totalWins}–{totalLosses}
            </dd>
            <dd className="text-muted-foreground text-xs">
              {t("gamesLabel", { count: totalGames })}
            </dd>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3">
            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              Winrate
            </dt>
            <dd
              className={cn(
                "font-mono text-xl leading-none font-semibold tabular-nums",
                winrateClass(totalWinrate, totalGames > 0)
              )}
            >
              {totalGames > 0 ? `${totalWinrate.toFixed(1)}%` : "—"}
            </dd>
            <dd className="text-muted-foreground text-xs">overall</dd>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3">
            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              Lineups
            </dt>
            <dd className="text-foreground font-mono text-xl leading-none font-semibold tabular-nums">
              {sortedRosters.length}
            </dd>
            <dd className="text-muted-foreground text-xs">distinct</dd>
          </div>
        </dl>

        <section className="mt-6 space-y-3">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              Maps · Lineups
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">
              {t("rosterPerformance", { count: sortedRosters.length })}
            </h3>
          </div>

          {sortedRosters.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noData")}</p>
          ) : (
            <div className="border-border overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                    <th className="px-4 py-2 text-left font-medium">Lineup</th>
                    <th className="px-4 py-2 text-right font-medium">Games</th>
                    <th className="px-4 py-2 text-right font-medium">Record</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Winrate
                    </th>
                    <th className="w-24 px-4 py-2 text-right font-medium">
                      Tag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sortedRosters.map((roster, index) => {
                    const games = roster.wins + roster.losses;
                    const isBest = index === 0 && games > 0;
                    const isLowSample = games < 5;

                    return (
                      <tr
                        key={roster.players.join(",")}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {roster.players.map((player) => (
                              <span
                                key={player}
                                className="bg-muted/60 rounded-sm px-1.5 py-0.5 text-xs font-medium"
                              >
                                {player}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {games}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                          {roster.wins}–{roster.losses}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                            winrateClass(roster.winrate, games > 0)
                          )}
                        >
                          {games > 0 ? `${roster.winrate.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isBest ? (
                            <span className="bg-primary/15 text-primary rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                              {t("bestLineup")}
                            </span>
                          ) : isLowSample ? (
                            <span className="bg-muted text-muted-foreground rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                              {t("smallSample")}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}
