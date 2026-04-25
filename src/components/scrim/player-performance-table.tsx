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

const COLS =
  "grid-cols-[minmax(10rem,1fr)_3rem_3.5rem_4rem_4.5rem_5rem_5.5rem_3rem_minmax(6rem,8rem)]";

export function TrendIndicator({
  trend,
  trendData,
}: Pick<PlayerScrimPerformance, "trend" | "trendData">) {
  const improving = trendData?.improvingMetrics.length ?? 0;
  const declining = trendData?.decliningMetrics.length ?? 0;

  if (trend === "improving") {
    return (
      <span
        className="font-mono text-xs leading-none text-emerald-600 tabular-nums dark:text-emerald-400"
        aria-label={`Improving: ${improving} metrics trending up`}
      >
        ↑<span className="sr-only">Improving</span>
      </span>
    );
  }
  if (trend === "declining") {
    return (
      <span
        className="font-mono text-xs leading-none text-rose-600 tabular-nums dark:text-rose-400"
        aria-label={`Declining: ${declining} metrics trending down`}
      >
        ↓<span className="sr-only">Declining</span>
      </span>
    );
  }
  return (
    <span
      className="text-muted-foreground/60 font-mono text-xs leading-none"
      aria-label="Stable performance"
    >
      ·<span className="sr-only">Stable</span>
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
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
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

function PlayerRow({
  player,
  index,
}: {
  player: PlayerScrimPerformance;
  index: number;
}) {
  const topOutliers = player.outliers.slice(0, 2);
  const heroCount = Array.isArray(player.heroes) ? player.heroes.length : 0;
  const playerDisplayName = toDisplayText(player.playerName, "Unknown Player");
  const primaryHeroDisplay = toDisplayText(player.primaryHero, "Unknown Hero");
  const heroImageSlug = toSafeHeroImageSlug(primaryHeroDisplay);

  return (
    <li
      className={cn(
        "border-border hover:bg-muted/40 grid items-center gap-4 border-b py-3 transition-colors",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:[animation-fill-mode:both]",
        COLS
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
    >
      <div className="min-w-0">
        <PlayerPerformanceHoverChart
          playerName={playerDisplayName}
          primaryHero={player.primaryHero}
          heroLabel={primaryHeroDisplay}
          heroImageSlug={heroImageSlug}
          heroCount={heroCount}
          perMapPerformance={player.perMapPerformance}
        />
      </div>
      <div className="text-muted-foreground text-right font-mono text-sm tabular-nums">
        {player.mapsPlayed}
      </div>
      <div className="text-right font-mono text-sm tabular-nums">
        {player.kdRatio.toFixed(2)}
      </div>
      <div className="text-right font-mono text-sm tabular-nums">
        {player.eliminationsPer10.toFixed(1)}
      </div>
      <div className="text-right font-mono text-sm tabular-nums">
        {player.heroDamagePer10 > 0
          ? format(Math.round(player.heroDamagePer10))
          : "\u2014"}
      </div>
      <div className="text-right font-mono text-sm tabular-nums">
        {player.firstDeathRate.toFixed(1)}%
      </div>
      <div className="text-right font-mono text-sm tabular-nums">
        {player.teamFirstDeathRate.toFixed(1)}%
      </div>
      <div className="text-center">
        <TrendIndicator trend={player.trend} trendData={player.trendData} />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {topOutliers.length > 0 ? (
          topOutliers.map((outlier) => (
            <OutlierBadge key={outlier.stat} outlier={outlier} />
          ))
        ) : (
          <span className="text-muted-foreground/60 font-mono text-xs">
            &mdash;
          </span>
        )}
      </div>
    </li>
  );
}

export function PlayerPerformanceTable({
  players,
}: {
  players: PlayerScrimPerformance[];
}) {
  if (players.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[44rem]">
        <div
          className={cn(
            "text-muted-foreground border-border grid items-center gap-4 border-b pb-3 font-mono text-[11px] tracking-[0.14em] uppercase",
            COLS
          )}
        >
          <div>Player</div>
          <div className="text-right">Maps</div>
          <div className="text-right">K/D</div>
          <div className="text-right">Elims/10</div>
          <div className="text-right">Dmg/10</div>
          <div className="text-right">1st Death</div>
          <div className="text-right">Team 1st Death</div>
          <div className="text-center">Trend</div>
          <div>Outliers</div>
        </div>
        <ul>
          {players.map((player, index) => (
            <PlayerRow key={player.playerKey} player={player} index={index} />
          ))}
        </ul>
      </div>
    </div>
  );
}
