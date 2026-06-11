"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  POSITIONAL_STAT_FORMATTERS,
  POSITIONAL_STAT_KEYS,
  type PositionalStatKey,
} from "@/lib/positional-stat-display";
import { cn } from "@/lib/utils";

const EM_DASH = "—";

const HEAD_LABEL =
  "text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase";

// Diverging tint around the per-stat team median: cool (below) <-> neutral <->
// warm (above). Color encodes deviation magnitude and direction ONLY, never
// good/bad — several of these stats (engagement distance, fight-start spread,
// ult displacement) are descriptive, with no "better" direction. The exact
// value stays in every cell, so color is a redundant second encoding, not the
// only one (accessibility: never color alone).
const MAX_ALPHA = 0.42;
const ABOVE = { l: 0.72, c: 0.15, h: 70 }; // gold — above median
const BELOW = { l: 0.62, c: 0.13, h: 244 }; // blue — below median

export type PositionalPlayerRow = {
  playerName: string;
  stats: Record<string, number>;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

type ColumnScale = { median: number; maxAbsDev: number };

function buildScale(values: number[]): ColumnScale {
  if (values.length === 0) return { median: 0, maxAbsDev: 0 };
  const m = median(values);
  const maxAbsDev = Math.max(...values.map((v) => Math.abs(v - m)));
  return { median: m, maxAbsDev };
}

function tintFor(value: number, scale: ColumnScale): string | undefined {
  if (scale.maxAbsDev === 0) return undefined;
  const norm = (value - scale.median) / scale.maxAbsDev; // [-1, 1]
  const intensity = Math.min(1, Math.abs(norm));
  if (intensity < 0.02) return undefined;
  const alpha = (intensity * MAX_ALPHA).toFixed(3);
  const { l, c, h } = norm >= 0 ? ABOVE : BELOW;
  return `oklch(${l} ${c} ${h} / ${alpha})`;
}

export function PositionalStatHeatmap({
  players,
  playerLabel,
  statLabel,
  legend,
}: {
  players: PositionalPlayerRow[];
  playerLabel: string;
  statLabel: (stat: PositionalStatKey) => { short: string; full: string };
  legend: { below: string; above: string; caption: string };
}) {
  const scales = Object.fromEntries(
    POSITIONAL_STAT_KEYS.map((stat) => {
      const values = players
        .map((p) => p.stats[stat])
        .filter((v): v is number => v !== undefined && Number.isFinite(v));
      return [stat, buildScale(values)];
    })
  );

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className={cn(HEAD_LABEL, "bg-background sticky left-0")}
            >
              {playerLabel}
            </TableHead>
            {POSITIONAL_STAT_KEYS.map((stat) => (
              <TableHead key={stat} className={cn(HEAD_LABEL, "text-right")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted underline-offset-4">
                      {statLabel(stat).short}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{statLabel(stat).full}</TooltipContent>
                </Tooltip>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.playerName}>
              <TableCell className="bg-background sticky left-0 font-medium">
                {player.playerName}
              </TableCell>
              {POSITIONAL_STAT_KEYS.map((stat) => {
                const value = player.stats[stat];
                const tint =
                  value === undefined || !Number.isFinite(value)
                    ? undefined
                    : tintFor(value, scales[stat]);
                return (
                  <TableCell
                    key={stat}
                    className="text-right font-mono tabular-nums"
                    style={tint ? { backgroundColor: tint } : undefined}
                  >
                    {value === undefined
                      ? EM_DASH
                      : POSITIONAL_STAT_FORMATTERS[stat](value)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] tracking-[0.06em] uppercase">
        <span className="flex items-center gap-1.5">
          {legend.below}
          <span
            className="h-2 w-28 rounded-full"
            aria-hidden="true"
            style={{
              background: `linear-gradient(to right, oklch(${BELOW.l} ${BELOW.c} ${BELOW.h} / ${MAX_ALPHA}), transparent 50%, oklch(${ABOVE.l} ${ABOVE.c} ${ABOVE.h} / ${MAX_ALPHA}))`,
            }}
          />
          {legend.above}
        </span>
        <span className="normal-case">{legend.caption}</span>
      </div>
    </div>
  );
}
