import { PlayerPerformanceHoverChart } from "@/components/scrim/player-performance-hover-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import type {
  PlayerScrimPerformance,
  ScrimInsight,
} from "@/data/scrim-overview-dto";
import { getScrimOverview } from "@/data/scrim-overview-dto";
import { cn, format, toHero } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LightningBoltIcon,
  MinusIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";

type ScrimOverviewCardProps = {
  scrimId: number;
  teamId: number;
};

function WinLossBadge({
  wins,
  losses,
  draws,
}: {
  wins: number;
  losses: number;
  draws: number;
}) {
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Record: ${wins} wins, ${losses} losses, ${draws} draws`}
    >
      <span className="text-sm font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
        {wins}W
      </span>
      <span className="text-muted-foreground text-sm">·</span>
      <span className="text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
        {losses}L
      </span>
      {draws > 0 && (
        <>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-muted-foreground text-sm font-semibold tabular-nums">
            {draws}D
          </span>
        </>
      )}
    </div>
  );
}

function StatSummaryCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">
        {label}
        {sub ? ` · ${sub}` : ""}
      </span>
    </div>
  );
}

function InsightIcon({ type }: { type: ScrimInsight["type"] }) {
  switch (type) {
    case "mvp":
      return (
        <StarFilledIcon className="h-3.5 w-3.5 text-amber-500" aria-hidden />
      );
    case "most_improved":
      return (
        <ArrowUpIcon className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
      );
    case "most_declined":
      return (
        <ArrowDownIcon className="h-3.5 w-3.5 text-rose-500" aria-hidden />
      );
    case "outlier_positive":
      return (
        <LightningBoltIcon className="h-3.5 w-3.5 text-sky-500" aria-hidden />
      );
    case "outlier_negative":
      return (
        <ExclamationTriangleIcon
          className="h-3.5 w-3.5 text-orange-500"
          aria-hidden
        />
      );
  }
}

function InsightChip({ insight }: { insight: ScrimInsight }) {
  return (
    <div className="bg-muted/60 ring-border flex min-w-0 flex-1 items-start gap-2 rounded-lg p-3 ring-1">
      <span className="mt-0.5 shrink-0">
        <InsightIcon type={insight.type} />
      </span>
      <p className="text-foreground min-w-0 text-xs leading-relaxed">
        {insight.headline}
      </p>
    </div>
  );
}

function TrendIndicator({
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

function OutlierBadge({
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
  const hasChartData = player.perMapPerformance.length >= 2;

  return (
    <TableRow>
      <TableCell className="min-w-[140px]">
        <PlayerPerformanceHoverChart
          playerName={player.playerName}
          primaryHero={player.primaryHero}
          perMapPerformance={player.perMapPerformance}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              hasChartData && "cursor-pointer"
            )}
          >
            <div className="bg-muted relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
              <Image
                src={`/heroes/${toHero(player.primaryHero)}.png`}
                alt={player.primaryHero}
                fill
                className="object-cover"
                sizes="28px"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {player.playerName}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {player.primaryHero}
                {player.heroes.length > 1 && (
                  <span> +{player.heroes.length - 1}</span>
                )}
              </p>
            </div>
          </div>
        </PlayerPerformanceHoverChart>
      </TableCell>
      <TableCell className="text-center text-sm tabular-nums">
        {player.mapsPlayed}
      </TableCell>
      <TableCell className="text-center text-sm tabular-nums">
        {player.kdRatio.toFixed(2)}
      </TableCell>
      <TableCell className="text-center text-sm tabular-nums">
        {player.eliminationsPer10.toFixed(1)}
      </TableCell>
      <TableCell className="text-center text-sm tabular-nums">
        {player.heroDamagePer10 > 0
          ? format(Math.round(player.heroDamagePer10))
          : "—"}
      </TableCell>
      <TableCell className="text-center text-sm tabular-nums">
        {player.firstDeathRate.toFixed(1)}%
      </TableCell>
      <TableCell className="text-center text-sm tabular-nums">
        {player.teamFirstDeathRate.toFixed(1)}%
      </TableCell>
      <TableCell className="text-center">
        <TrendIndicator trend={player.trend} trendData={player.trendData} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {topOutliers.length > 0 ? (
            topOutliers.map((outlier) => (
              <OutlierBadge key={outlier.stat} outlier={outlier} />
            ))
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export async function ScrimOverviewCard({
  scrimId,
  teamId,
}: ScrimOverviewCardProps) {
  const data = await getScrimOverview(scrimId, teamId);

  if (data.mapCount === 0 || data.teamPlayers.length === 0) {
    return null;
  }

  const { wins, losses, draws, mapCount, teamTotals, teamPlayers, insights } =
    data;

  const winRate = mapCount > 0 ? Math.round((wins / mapCount) * 100) : 0;
  const kdDisplay = teamTotals.kdRatio.toFixed(2);
  const totalElims = teamTotals.eliminations;
  const totalDamage = teamTotals.heroDamage;

  // Headline insight: prioritize the most impactful insight for the sub-header
  const headlineInsight = insights.find(
    (i) => i.type === "mvp" || i.type === "outlier_positive"
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">
              Scrim Overview
            </CardTitle>
            {headlineInsight && (
              <p className="text-muted-foreground text-sm">
                {headlineInsight.headline}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <WinLossBadge wins={wins} losses={losses} draws={draws} />
            <Badge variant="secondary" className="tabular-nums">
              {winRate}% win rate
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatSummaryCell
            label="Maps"
            value={String(mapCount)}
            sub={`${wins}W · ${losses}L`}
          />
          <span className="bg-border h-4 w-px shrink-0" aria-hidden />
          <StatSummaryCell
            label="Team K/D"
            value={kdDisplay}
            sub={`${totalElims} elims`}
          />
          <span className="bg-border h-4 w-px shrink-0" aria-hidden />
          <StatSummaryCell
            label="Total Damage"
            value={format(Math.round(totalDamage))}
            sub="hero damage"
          />
          <span className="bg-border h-4 w-px shrink-0" aria-hidden />
          <StatSummaryCell
            label="Total Healing"
            value={format(Math.round(teamTotals.healing))}
            sub="healing dealt"
          />
        </div>

        {insights.length > 0 && (
          <>
            <Separator />
            {/* Insights strip */}
            <section aria-label="Performance insights">
              <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                Key Insights
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {insights.map((insight) => (
                  <InsightChip key={insight.headline} insight={insight} />
                ))}
              </div>
            </section>
          </>
        )}

        {teamPlayers.length > 0 && (
          <>
            <Separator />
            {/* Player performance table */}
            <section aria-label="Player performance breakdown">
              <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                Player Performance
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Maps</TableHead>
                    <TableHead className="text-center">K/D</TableHead>
                    <TableHead className="text-center">Elims/10</TableHead>
                    <TableHead className="text-center">Dmg/10</TableHead>
                    <TableHead className="text-center">1st Death %</TableHead>
                    <TableHead className="text-center">
                      Team 1st Death %
                    </TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead>Outliers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPlayers.map((player) => (
                    <PlayerRow key={player.playerName} player={player} />
                  ))}
                </TableBody>
              </Table>
            </section>
          </>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex items-center gap-1.5">
          <InfoCircledIcon
            className="text-muted-foreground h-3.5 w-3.5 shrink-0"
            aria-hidden
          />
          <p className="text-muted-foreground text-xs">
            Hover over a player&apos;s name to see their performance trend
            across maps.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
