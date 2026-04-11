"use client";

import { PlayerPerformanceHoverChart } from "@/components/scrim/player-performance-hover-chart";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PlayerScrimPerformance } from "@/data/scrim/types";
import { cn, format, toHero } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "@radix-ui/react-icons";

function toDisplayText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toSafeHeroImageSlug(heroName: string): string {
  try {
    const slug = toHero(heroName).trim();
    return slug.length > 0 ? slug : "ana";
  } catch {
    return "ana";
  }
}

export function TrendIndicator({
  trend,
  trendData,
}: Pick<PlayerScrimPerformance, "trend" | "trendData">) {
  const improving = trendData?.improvingMetrics.length ?? 0;
  const declining = trendData?.decliningMetrics.length ?? 0;

  if (trend === "improving") {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
        aria-label={`Improving: ${improving} metrics trending up`}
      >
        <ArrowUpIcon className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Improving</span>
      </span>
    );
  }
  if (trend === "declining") {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400"
        aria-label={`Declining: ${declining} metrics trending down`}
      >
        <ArrowDownIcon className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Declining</span>
      </span>
    );
  }
  return (
    <span
      className="text-muted-foreground inline-flex items-center gap-1 text-xs"
      aria-label="Stable performance"
    >
      <MinusIcon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">Stable</span>
    </span>
  );
}

export function OutlierBadge({
  outlier,
}: {
  outlier: PlayerScrimPerformance["outliers"][number];
}) {
  const isPositive = outlier.direction === "high";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={cn(
            "cursor-default font-mono text-[10px]",
            isPositive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
          )}
          variant="outline"
          aria-label={`${outlier.label} at ${outlier.percentile}th percentile vs database`}
        >
          {outlier.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {outlier.label}: {outlier.percentile}th %ile vs database
          {isPositive ? " (elite)" : " (below avg)"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function PlayerRow({ player }: { player: PlayerScrimPerformance }) {
  const topOutliers = player.outliers.slice(0, 2);
  const heroCount = Array.isArray(player.heroes) ? player.heroes.length : 0;
  const playerDisplayName = toDisplayText(player.playerName, "Unknown Player");
  const primaryHeroDisplay = toDisplayText(player.primaryHero, "Unknown Hero");
  const heroImageSlug = toSafeHeroImageSlug(primaryHeroDisplay);

  return (
    <tr className="hover:bg-muted/50 border-b transition-colors">
      <td className="min-w-[140px] p-2 align-middle whitespace-nowrap">
        <PlayerPerformanceHoverChart
          playerName={playerDisplayName}
          primaryHero={player.primaryHero}
          heroLabel={primaryHeroDisplay}
          heroImageSlug={heroImageSlug}
          heroCount={heroCount}
          perMapPerformance={player.perMapPerformance}
        />
      </td>
      <td className="p-2 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {player.mapsPlayed}
      </td>
      <td className="p-2 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {player.kdRatio.toFixed(2)}
      </td>
      <td className="p-2 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {player.eliminationsPer10.toFixed(1)}
      </td>
      <td className="p-2 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {player.heroDamagePer10 > 0
          ? format(Math.round(player.heroDamagePer10))
          : "\u2014"}
      </td>
      <td className="p-2 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {player.firstDeathRate.toFixed(1)}%
      </td>
      <td className="p-2 text-center align-middle text-sm whitespace-nowrap tabular-nums">
        {player.teamFirstDeathRate.toFixed(1)}%
      </td>
      <td className="p-2 text-center align-middle whitespace-nowrap">
        <TrendIndicator trend={player.trend} trendData={player.trendData} />
      </td>
      <td className="p-2 align-middle whitespace-nowrap">
        <div className="flex flex-wrap gap-1">
          {topOutliers.length > 0 ? (
            topOutliers.map((outlier) => (
              <OutlierBadge key={outlier.stat} outlier={outlier} />
            ))
          ) : (
            <span className="text-muted-foreground text-xs">&mdash;</span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PlayerPerformanceTable({
  players,
}: {
  players: PlayerScrimPerformance[];
}) {
  if (players.length === 0) return null;

  return (
    <div className="relative w-full overflow-x-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="hover:bg-muted/50 border-b transition-colors">
            <th className="text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap">
              Player
            </th>
            <th className="text-foreground h-10 px-2 text-center align-middle font-medium whitespace-nowrap">
              Maps
            </th>
            <th className="text-foreground h-10 px-2 text-center align-middle font-medium whitespace-nowrap">
              K/D
            </th>
            <th className="text-foreground h-10 px-2 text-center align-middle font-medium whitespace-nowrap">
              Elims/10
            </th>
            <th className="text-foreground h-10 px-2 text-center align-middle font-medium whitespace-nowrap">
              Dmg/10
            </th>
            <th className="text-foreground h-10 px-2 text-center align-middle font-medium whitespace-nowrap">
              1st Death %
            </th>
            <th className="text-foreground h-10 px-2 text-center align-middle font-medium whitespace-nowrap">
              Team 1st Death %
            </th>
            <th className="text-foreground h-10 px-2 text-center align-middle font-medium whitespace-nowrap">
              Trend
            </th>
            <th className="text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap">
              Outliers
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {players.map((player) => (
            <PlayerRow key={player.playerKey} player={player} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
