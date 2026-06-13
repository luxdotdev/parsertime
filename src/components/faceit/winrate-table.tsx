"use client";

import { MeterBar } from "@/components/faceit/viz";
import type { MapWinrateEntry } from "@/data/faceit/types";
import { cn } from "@/lib/utils";

type Labels = {
  key: string;
  played: string;
  won: string;
  winRate: string;
  lowSample: string;
  empty: string;
};

/**
 * Flat winrate table used by both team and player scouting. Each row carries a
 * proportional win-rate bar with a 50% break-even tick, so above/below even
 * reads at a glance. `winRate` is a percent (0..100). Rows are expected sorted
 * by the caller (we keep DB order otherwise).
 */
export function WinrateTable({
  rows,
  labels,
}: {
  rows: MapWinrateEntry[];
  labels: Labels;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{labels.empty}</p>;
  }

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            <th className="px-4 py-2 text-left font-medium">{labels.key}</th>
            <th
              className="hidden w-40 px-4 py-2 text-left font-medium sm:table-cell"
              aria-hidden="true"
            />
            <th className="px-4 py-2 text-right font-medium">
              {labels.winRate}
            </th>
            <th className="px-4 py-2 text-right font-medium">{labels.played}</th>
            <th className="px-4 py-2 text-right font-medium">{labels.won}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row) => {
            const above = Math.round(row.winRate) >= 50;
            return (
              <tr
                key={row.key}
                className={cn(
                  "hover:bg-muted/30 transition-colors",
                  !row.rated && "text-muted-foreground"
                )}
              >
                <td className="px-4 py-3">
                  <span className="text-foreground mr-2 font-medium">
                    {row.key}
                  </span>
                  {!row.rated ? (
                    <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase">
                      {labels.lowSample}
                    </span>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <MeterBar
                    value={row.winRate}
                    max={100}
                    referenceAt={0.5}
                    tone={row.rated ? (above ? "primary" : "destructive") : "muted"}
                  />
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                    row.rated && above && "text-primary",
                    row.rated && !above && "text-destructive"
                  )}
                >
                  {Math.round(row.winRate)}%
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                  {row.played}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                  {row.won}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
