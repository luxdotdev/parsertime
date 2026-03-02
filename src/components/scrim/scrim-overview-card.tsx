import { UltTimingChart } from "@/components/charts/ult-timing-chart";
import { CollapsibleCard } from "@/components/scrim/collapsible-card-wrapper";
import { PlayerPerformanceHoverChart } from "@/components/scrim/player-performance-hover-chart";
import { UltComparisonChart } from "@/components/scrim/ult-comparison-chart";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  PlayerScrimPerformance,
  ScrimFightAnalysis,
  ScrimInsight,
  ScrimSwapAnalysis,
  ScrimUltAnalysis,
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
    <div className="bg-muted/60 border-border flex min-w-0 flex-1 items-start gap-2 rounded-lg border p-3">
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
          : "—"}
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
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function HighlightedPct({
  value,
  favorable,
}: {
  value: number;
  favorable: boolean;
}) {
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        favorable
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      )}
    >
      {Math.round(value)}%
    </span>
  );
}

function FightAnalysisSection({ analysis }: { analysis: ScrimFightAnalysis }) {
  if (analysis.totalFights === 0) return null;

  const fightsLost = analysis.totalFights - analysis.fightsWon;

  return (
    <>
      <Separator />
      <section aria-label="Fight analysis">
        <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          Fight Analysis
        </h4>
        <ul className="text-foreground space-y-2 text-sm leading-relaxed">
          <li>
            Overall fight win rate:{" "}
            <HighlightedPct
              value={analysis.fightWinrate}
              favorable={analysis.fightWinrate >= 50}
            />{" "}
            <span className="text-muted-foreground">
              ({analysis.fightsWon}W / {fightsLost}L across{" "}
              {analysis.totalFights} fights)
            </span>
          </li>

          <li>
            Your team died first in{" "}
            <HighlightedPct
              value={analysis.teamFirstDeathRate}
              favorable={analysis.teamFirstDeathRate < 50}
            />{" "}
            of fights.
            {analysis.teamFirstDeathCount > 0 &&
              analysis.firstPickCount > 0 && (
                <>
                  {" "}
                  When you died first, you still won{" "}
                  <HighlightedPct
                    value={analysis.firstDeathWinrate}
                    favorable={analysis.firstDeathWinrate >= 50}
                  />{" "}
                  of those fights vs{" "}
                  <HighlightedPct
                    value={analysis.firstPickWinrate}
                    favorable={analysis.firstPickWinrate >= 50}
                  />{" "}
                  when you got first pick.
                </>
              )}
          </li>

          {analysis.firstPickCount > 0 && (
            <li>
              Your team got first pick in{" "}
              <HighlightedPct
                value={analysis.firstPickRate}
                favorable={analysis.firstPickRate >= 50}
              />{" "}
              of fights, winning{" "}
              <HighlightedPct
                value={analysis.firstPickWinrate}
                favorable={analysis.firstPickWinrate >= 50}
              />{" "}
              of them.
            </li>
          )}

          {(analysis.firstUltCount > 0 ||
            analysis.opponentFirstUltCount > 0) && (
            <li>
              {analysis.firstUltCount > 0 ? (
                <>
                  When your team used ultimates first, you won{" "}
                  <HighlightedPct
                    value={analysis.firstUltWinrate}
                    favorable={analysis.firstUltWinrate >= 50}
                  />{" "}
                  of those fights.
                </>
              ) : null}
              {analysis.firstUltCount > 0 && analysis.opponentFirstUltCount > 0
                ? " "
                : null}
              {analysis.opponentFirstUltCount > 0 ? (
                <>
                  When the opponent used ultimates first, your win rate
                  {analysis.firstUltCount > 0 ? " dropped to " : " was "}
                  <HighlightedPct
                    value={analysis.opponentFirstUltWinrate}
                    favorable={analysis.opponentFirstUltWinrate >= 50}
                  />
                  .
                </>
              ) : null}
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

function UltAnalysisSection({
  analysis,
  teamNames,
}: {
  analysis: ScrimUltAnalysis;
  teamNames: readonly [string, string];
}) {
  if (analysis.ourUltsUsed === 0 && analysis.opponentUltsUsed === 0) {
    return null;
  }

  const hasComparisons = analysis.playerComparisons.length > 0;

  const allOurTimings = analysis.ultsByRole.flatMap((r) => r.ourSubroleTimings);
  const allOpponentTimings = analysis.ultsByRole.flatMap(
    (r) => r.opponentSubroleTimings
  );
  const hasTimingData =
    allOurTimings.length > 0 || allOpponentTimings.length > 0;
  const hasCharts = hasComparisons || hasTimingData;

  return (
    <>
      <Separator />
      <section aria-label="Ultimate analysis">
        <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          Ultimate Analysis
        </h4>
        <div
          className={cn(
            "gap-6",
            hasCharts ? "grid grid-cols-1 lg:grid-cols-2" : ""
          )}
        >
          <ul className="text-foreground space-y-2 text-sm leading-relaxed">
            <li>
              Your team used{" "}
              <span className="font-semibold tabular-nums">
                {analysis.ourUltsUsed}
              </span>{" "}
              ultimates vs opponent&apos;s{" "}
              <span className="font-semibold tabular-nums">
                {analysis.opponentUltsUsed}
              </span>
              .
            </li>

            {analysis.ultsByRole
              .filter((r) => r.ourCount > 0 || r.opponentCount > 0)
              .map((r) => {
                const totalSubroleUlts = r.ourSubroleTimings.reduce(
                  (sum, s) => sum + s.count,
                  0
                );
                return (
                  <li key={r.role}>
                    {r.role} ultimates: your team used{" "}
                    <span className="font-semibold tabular-nums">
                      {r.ourCount}
                    </span>{" "}
                    vs opponent&apos;s{" "}
                    <span className="font-semibold tabular-nums">
                      {r.opponentCount}
                    </span>
                    .
                    {r.ourFirstRate > 0 && (
                      <>
                        {" "}
                        You used {r.role.toLowerCase()} ultimates first in{" "}
                        <HighlightedPct
                          value={r.ourFirstRate}
                          favorable={r.ourFirstRate >= 50}
                        />{" "}
                        of fights.
                      </>
                    )}
                    {r.ourSubroleTimings.length > 0 && (
                      <ul className="text-muted-foreground mt-1 ml-4 space-y-0.5 text-xs">
                        {r.ourSubroleTimings.map((sr) => (
                          <li key={sr.subrole}>
                            {sr.subrole}:{" "}
                            <span className="text-foreground font-semibold tabular-nums">
                              {sr.count}
                            </span>{" "}
                            {sr.count === 1 ? "ultimate" : "ultimates"} (
                            {totalSubroleUlts > 0
                              ? ((sr.count / totalSubroleUlts) * 100).toFixed(0)
                              : 0}
                            %) &mdash;{" "}
                            <span className="text-green-500">
                              {sr.initiation} initiation
                            </span>
                            ,{" "}
                            <span className="text-yellow-500">
                              {sr.midfight} midfight
                            </span>
                            ,{" "}
                            <span className="text-red-500">{sr.late} late</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}

            {analysis.fightsWithUlts > 0 && (
              <>
                <li>
                  Your team initiated fights with ultimates in{" "}
                  <HighlightedPct
                    value={
                      (analysis.ourFightInitiations / analysis.fightsWithUlts) *
                      100
                    }
                    favorable={
                      analysis.ourFightInitiations >=
                      analysis.opponentFightInitiations
                    }
                  />{" "}
                  of ultimate-involved fights (
                  <span className="font-semibold tabular-nums">
                    {analysis.ourFightInitiations}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold tabular-nums">
                    {analysis.fightsWithUlts}
                  </span>
                  ).
                </li>
                {analysis.ourTopFightInitiator && (
                  <li>
                    Your most common fight-opening ultimate:{" "}
                    <span className="font-semibold">
                      {analysis.ourTopFightInitiator.hero}
                    </span>{" "}
                    (
                    <span className="font-semibold tabular-nums">
                      {analysis.ourTopFightInitiator.count}
                    </span>{" "}
                    {analysis.ourTopFightInitiator.count === 1
                      ? "fight"
                      : "fights"}
                    ).
                  </li>
                )}
                {analysis.opponentTopFightInitiator && (
                  <li>
                    Opponent&apos;s most common fight-opening ultimate:{" "}
                    <span className="font-semibold">
                      {analysis.opponentTopFightInitiator.hero}
                    </span>{" "}
                    (
                    <span className="font-semibold tabular-nums">
                      {analysis.opponentTopFightInitiator.count}
                    </span>{" "}
                    {analysis.opponentTopFightInitiator.count === 1
                      ? "fight"
                      : "fights"}
                    ).
                  </li>
                )}
              </>
            )}

            {analysis.topUltUser && (
              <li>
                Top ultimate user:{" "}
                <span className="font-semibold">
                  {analysis.topUltUser.playerName}
                </span>{" "}
                ({analysis.topUltUser.hero}) with{" "}
                <span className="font-semibold tabular-nums">
                  {analysis.topUltUser.count}
                </span>{" "}
                ultimates used.
              </li>
            )}

            {(analysis.avgChargeTime > 0 || analysis.avgHoldTime > 0) && (
              <li>
                {analysis.avgChargeTime > 0 && (
                  <>
                    Your team charged ultimates in an average of{" "}
                    <span className="font-semibold tabular-nums">
                      {analysis.avgChargeTime.toFixed(1)}s
                    </span>
                  </>
                )}
                {analysis.avgChargeTime > 0 &&
                  analysis.avgHoldTime > 0 &&
                  " and "}
                {analysis.avgHoldTime > 0 && (
                  <>
                    held them for an average of{" "}
                    <span className="font-semibold tabular-nums">
                      {analysis.avgHoldTime.toFixed(1)}s
                    </span>{" "}
                    before using
                  </>
                )}
                .
              </li>
            )}

            {analysis.ultEfficiency.totalUltsUsedInFights > 0 && (
              <>
                <li>
                  Ultimate Efficiency:{" "}
                  <span className="font-semibold tabular-nums">
                    {analysis.ultEfficiency.ultimateEfficiency.toFixed(2)}
                  </span>{" "}
                  fights won per ultimate used (
                  {analysis.ultEfficiency.ultimateEfficiency >= 0.4
                    ? "Excellent"
                    : analysis.ultEfficiency.ultimateEfficiency >= 0.25
                      ? "Good"
                      : analysis.ultEfficiency.ultimateEfficiency >= 0.15
                        ? "Average"
                        : "Poor"}
                  ).
                </li>
                <li>
                  Used an average of{" "}
                  <span className="font-semibold text-green-600 tabular-nums dark:text-green-400">
                    {analysis.ultEfficiency.avgUltsInWonFights.toFixed(1)}
                  </span>{" "}
                  ultimates per won fight vs{" "}
                  <span className="font-semibold text-red-600 tabular-nums dark:text-red-400">
                    {analysis.ultEfficiency.avgUltsInLostFights.toFixed(1)}
                  </span>{" "}
                  per lost fight.{" "}
                  {analysis.ultEfficiency.avgUltsInWonFights >
                  analysis.ultEfficiency.avgUltsInLostFights
                    ? "Good ultimate discipline — more ultimates used in wins than losses."
                    : "Room for improvement — more ultimates used in losses than wins."}
                </li>
                {analysis.ultEfficiency.wastedUltimates > 0 && (
                  <li>
                    <span className="font-semibold tabular-nums">
                      {analysis.ultEfficiency.wastedUltimates}
                    </span>{" "}
                    wasted{" "}
                    {analysis.ultEfficiency.wastedUltimates === 1
                      ? "ultimate"
                      : "ultimates"}{" "}
                    (
                    <span className="font-semibold tabular-nums">
                      {(
                        (analysis.ultEfficiency.wastedUltimates /
                          analysis.ultEfficiency.totalUltsUsedInFights) *
                        100
                      ).toFixed(1)}
                      %
                    </span>{" "}
                    of total) used in lost situations (3+ player disadvantage).
                  </li>
                )}
                <li>
                  <span className="font-semibold tabular-nums">
                    {analysis.ultEfficiency.dryFights}
                  </span>{" "}
                  dry{" "}
                  {analysis.ultEfficiency.dryFights === 1 ? "fight" : "fights"}{" "}
                  (no ultimates used) with a{" "}
                  <span className="font-semibold tabular-nums">
                    {analysis.ultEfficiency.dryFightWinrate.toFixed(1)}%
                  </span>{" "}
                  win rate, plus{" "}
                  <span className="font-semibold tabular-nums">
                    {analysis.ultEfficiency.nonDryFights}
                  </span>{" "}
                  {analysis.ultEfficiency.nonDryFights === 1
                    ? "fight"
                    : "fights"}{" "}
                  where ultimates were used (
                  <span className="font-semibold tabular-nums">
                    {analysis.ultEfficiency.nonDryFights > 0
                      ? (
                          (analysis.ultEfficiency.fightsWon /
                            analysis.ultEfficiency.nonDryFights) *
                          100
                        ).toFixed(1)
                      : "0.0"}
                    %
                  </span>{" "}
                  WR).
                </li>
              </>
            )}
          </ul>

          {hasCharts && (
            <div className="space-y-6">
              {hasComparisons && (
                <div className="min-h-[300px]">
                  <h5 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                    Ultimate Usage by Subrole
                  </h5>
                  <UltComparisonChart
                    comparisons={analysis.playerComparisons}
                    teamNames={teamNames}
                  />
                </div>
              )}
              {hasTimingData && (
                <div className="min-h-[300px]">
                  <h5 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                    Ultimate Timing Breakdown
                  </h5>
                  <UltTimingChart
                    team1Timings={allOurTimings}
                    team2Timings={allOpponentTimings}
                    teamNames={teamNames}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function HeroSwapAnalysisSection({
  analysis,
}: {
  analysis: ScrimSwapAnalysis;
}) {
  if (analysis.ourSwaps === 0 && analysis.opponentSwaps === 0) return null;

  const winrateDelta = analysis.swapWinrate - analysis.noSwapWinrate;
  const swapTotal = analysis.swapWins + analysis.swapLosses;
  const noSwapTotal = analysis.noSwapWins + analysis.noSwapLosses;
  const countBucketsWithData = analysis.winrateBySwapCount.filter(
    (b) => b.totalMaps > 0
  );
  const timingBucketsWithData = analysis.timingOutcomes.filter(
    (b) => b.totalMaps > 0
  );

  return (
    <>
      <Separator />
      <section aria-label="Hero swap analysis">
        <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          Hero Swap Analysis
        </h4>
        <ul className="text-foreground space-y-2 text-sm leading-relaxed">
          <li>
            Your team made{" "}
            <span className="font-semibold tabular-nums">
              {analysis.ourSwaps}
            </span>{" "}
            hero swaps across all maps (
            <span className="font-semibold tabular-nums">
              {analysis.ourSwapsPerMap.toFixed(1)}
            </span>{" "}
            per map) vs opponent&apos;s{" "}
            <span className="font-semibold tabular-nums">
              {analysis.opponentSwaps}
            </span>{" "}
            (
            <span className="font-semibold tabular-nums">
              {analysis.opponentSwapsPerMap.toFixed(1)}
            </span>{" "}
            per map).
          </li>

          {swapTotal > 0 && noSwapTotal > 0 && (
            <li>
              Win rate on maps with swaps:{" "}
              <HighlightedPct
                value={analysis.swapWinrate}
                favorable={analysis.swapWinrate >= 50}
              />{" "}
              <span className="text-muted-foreground">
                ({analysis.swapWins}W / {analysis.swapLosses}L)
              </span>{" "}
              vs{" "}
              <HighlightedPct
                value={analysis.noSwapWinrate}
                favorable={analysis.noSwapWinrate >= 50}
              />{" "}
              without swaps{" "}
              <span className="text-muted-foreground">
                ({analysis.noSwapWins}W / {analysis.noSwapLosses}L)
              </span>
              .
              {Math.abs(winrateDelta) >= 5 && (
                <>
                  {" "}
                  That&apos;s a{" "}
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      winrateDelta > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {winrateDelta > 0 ? "+" : ""}
                    {winrateDelta.toFixed(0)}%
                  </span>{" "}
                  difference when swapping.
                </>
              )}
            </li>
          )}

          {analysis.avgHeroTimeBeforeSwap > 0 && (
            <li>
              Average time on a hero before swapping:{" "}
              <span className="font-semibold tabular-nums">
                {analysis.avgHeroTimeBeforeSwap.toFixed(0)}s
              </span>
              .
            </li>
          )}

          {analysis.ourTopSwap && (
            <li>
              Your most common swap:{" "}
              <span className="font-semibold">{analysis.ourTopSwap.from}</span>{" "}
              &rarr;{" "}
              <span className="font-semibold">{analysis.ourTopSwap.to}</span> (
              <span className="font-semibold tabular-nums">
                {analysis.ourTopSwap.count}
              </span>{" "}
              {analysis.ourTopSwap.count === 1 ? "time" : "times"}).
            </li>
          )}

          {analysis.opponentTopSwap && (
            <li>
              Opponent&apos;s most common swap:{" "}
              <span className="font-semibold">
                {analysis.opponentTopSwap.from}
              </span>{" "}
              &rarr;{" "}
              <span className="font-semibold">
                {analysis.opponentTopSwap.to}
              </span>{" "}
              (
              <span className="font-semibold tabular-nums">
                {analysis.opponentTopSwap.count}
              </span>{" "}
              {analysis.opponentTopSwap.count === 1 ? "time" : "times"}).
            </li>
          )}

          {analysis.topSwapper && (
            <li>
              Most active swapper:{" "}
              <span className="font-semibold">
                {analysis.topSwapper.playerName}
              </span>{" "}
              with{" "}
              <span className="font-semibold tabular-nums">
                {analysis.topSwapper.count}
              </span>{" "}
              swaps across{" "}
              <span className="font-semibold tabular-nums">
                {analysis.topSwapper.mapsCount}
              </span>{" "}
              {analysis.topSwapper.mapsCount === 1 ? "map" : "maps"}.
            </li>
          )}

          {countBucketsWithData.length > 0 && (
            <li>
              Win rate by swap count:{" "}
              {countBucketsWithData.map((bucket, i) => (
                <span key={bucket.label}>
                  {i > 0 && ", "}
                  {bucket.label}:{" "}
                  <HighlightedPct
                    value={bucket.winrate}
                    favorable={bucket.winrate >= 50}
                  />{" "}
                  <span className="text-muted-foreground">
                    ({bucket.wins}W-{bucket.losses}L)
                  </span>
                </span>
              ))}
              .
            </li>
          )}

          {timingBucketsWithData.length > 0 && (
            <li>
              Win rate by swap timing:{" "}
              {timingBucketsWithData.map((bucket, i) => (
                <span key={bucket.label}>
                  {i > 0 && ", "}
                  {bucket.label}:{" "}
                  <HighlightedPct
                    value={bucket.winrate}
                    favorable={bucket.winrate >= 50}
                  />{" "}
                  <span className="text-muted-foreground">
                    ({bucket.totalMaps}{" "}
                    {bucket.totalMaps === 1 ? "map" : "maps"})
                  </span>
                </span>
              ))}
              .
            </li>
          )}
        </ul>
      </section>
    </>
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

  const {
    wins,
    losses,
    draws,
    mapCount,
    ourTeamName,
    opponentTeamName,
    teamTotals,
    teamPlayers,
    insights,
    fightAnalysis,
    ultAnalysis,
    swapAnalysis,
  } = data;

  const winRate = mapCount > 0 ? Math.round((wins / mapCount) * 100) : 0;
  const kdDisplay = teamTotals.kdRatio.toFixed(2);
  const totalElims = teamTotals.eliminations;
  const totalDamage = teamTotals.heroDamage;

  // Headline insight: prioritize the most impactful insight for the sub-header
  const headlineInsight = insights.find(
    (i) => i.type === "mvp" || i.type === "outlier_positive"
  );

  return (
    <CollapsibleCard
      header={
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
      }
    >
      <CardContent className="mb-4 space-y-6">
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
                    {teamPlayers.map((player) => (
                      <PlayerRow key={player.playerKey} player={player} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <FightAnalysisSection analysis={fightAnalysis} />
        <HeroSwapAnalysisSection analysis={swapAnalysis} />
        <UltAnalysisSection
          analysis={ultAnalysis}
          teamNames={[
            ourTeamName || "Your Team",
            opponentTeamName || "Opponent",
          ]}
        />
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
    </CollapsibleCard>
  );
}
