"use client";

import { UltTimingChart } from "@/components/charts/ult-timing-chart";
import { UltComparisonChart } from "@/components/scrim/ult-comparison-chart";
import { Separator } from "@/components/ui/separator";
import type {
  ScrimFightAnalysis,
  ScrimSwapAnalysis,
  ScrimUltAnalysis,
} from "@/data/scrim/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function HighlightedPct({
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

export function FightAnalysisSection({
  analysis,
}: {
  analysis: ScrimFightAnalysis;
}) {
  const t = useTranslations("scrimPage.rawStatsSections.fights");
  if (analysis.totalFights === 0) return null;

  const fightsLost = analysis.totalFights - analysis.fightsWon;
  function rate(value: number, favorable: boolean) {
    function Rate(_chunks: ReactNode) {
      return <HighlightedPct value={value} favorable={favorable} />;
    }
    return Rate;
  }

  function muted(chunks: ReactNode) {
    return <span className="text-muted-foreground">{chunks}</span>;
  }

  return (
    <>
      <Separator />
      <section aria-label={t("label")}>
        <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          {t("title")}
        </h4>
        <ul className="text-foreground space-y-2 text-sm leading-relaxed">
          <li>
            {t.rich("overallWinRate", {
              winrate: Math.round(analysis.fightWinrate),
              won: analysis.fightsWon,
              lost: fightsLost,
              total: analysis.totalFights,
              rate: rate(analysis.fightWinrate, analysis.fightWinrate >= 50),
              muted,
            })}
          </li>

          <li>
            {t.rich("teamFirstDeath", {
              rateValue: Math.round(analysis.teamFirstDeathRate),
              rate: rate(
                analysis.teamFirstDeathRate,
                analysis.teamFirstDeathRate < 50
              ),
            })}
            {analysis.teamFirstDeathCount > 0 &&
              analysis.firstPickCount > 0 && (
                <>
                  {" "}
                  {t.rich("teamFirstDeathComparison", {
                    firstDeathWinrate: Math.round(analysis.firstDeathWinrate),
                    firstPickWinrate: Math.round(analysis.firstPickWinrate),
                    firstDeathRate: rate(
                      analysis.firstDeathWinrate,
                      analysis.firstDeathWinrate >= 50
                    ),
                    firstPickRate: rate(
                      analysis.firstPickWinrate,
                      analysis.firstPickWinrate >= 50
                    ),
                  })}
                </>
              )}
          </li>

          {analysis.firstPickCount > 0 && (
            <li>
              {t.rich("firstPick", {
                firstPickRate: Math.round(analysis.firstPickRate),
                firstPickWinrate: Math.round(analysis.firstPickWinrate),
                pickRate: rate(
                  analysis.firstPickRate,
                  analysis.firstPickRate >= 50
                ),
                winRate: rate(
                  analysis.firstPickWinrate,
                  analysis.firstPickWinrate >= 50
                ),
              })}
            </li>
          )}

          {(analysis.firstUltCount > 0 ||
            analysis.opponentFirstUltCount > 0) && (
            <li>
              {analysis.firstUltCount > 0 ? (
                <>
                  {t.rich("firstUlt", {
                    winrate: Math.round(analysis.firstUltWinrate),
                    rate: rate(
                      analysis.firstUltWinrate,
                      analysis.firstUltWinrate >= 50
                    ),
                  })}
                </>
              ) : null}
              {analysis.firstUltCount > 0 && analysis.opponentFirstUltCount > 0
                ? " "
                : null}
              {analysis.opponentFirstUltCount > 0 ? (
                <>
                  {t.rich("opponentFirstUlt", {
                    hasFirstUlt: analysis.firstUltCount > 0 ? "yes" : "no",
                    winrate: Math.round(analysis.opponentFirstUltWinrate),
                    rate: rate(
                      analysis.opponentFirstUltWinrate,
                      analysis.opponentFirstUltWinrate >= 50
                    ),
                  })}
                </>
              ) : null}
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

export function UltAnalysisSection({
  analysis,
  teamNames,
}: {
  analysis: ScrimUltAnalysis;
  teamNames: readonly [string, string];
}) {
  const t = useTranslations("scrimPage.rawStatsSections.ultimates");
  const tRatings = useTranslations(
    "scrimPage.overviewSections.ultimates.ratings"
  );
  const tHeadings = useTranslations(
    "scrimPage.overviewSections.ultimates.headings"
  );
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
      <section aria-label={t("label")}>
        <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          {t("title")}
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
                    {t.rich("ourTopFightInitiator", {
                      hero: analysis.ourTopFightInitiator.hero,
                      count: analysis.ourTopFightInitiator.count,
                      strong: (chunks: ReactNode) => (
                        <span className="font-semibold">{chunks}</span>
                      ),
                      n: (chunks: ReactNode) => (
                        <span className="font-semibold tabular-nums">
                          {chunks}
                        </span>
                      ),
                    })}
                  </li>
                )}
                {analysis.opponentTopFightInitiator && (
                  <li>
                    {t.rich("opponentTopFightInitiator", {
                      hero: analysis.opponentTopFightInitiator.hero,
                      count: analysis.opponentTopFightInitiator.count,
                      strong: (chunks: ReactNode) => (
                        <span className="font-semibold">{chunks}</span>
                      ),
                      n: (chunks: ReactNode) => (
                        <span className="font-semibold tabular-nums">
                          {chunks}
                        </span>
                      ),
                    })}
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
                    ? tRatings("excellent")
                    : analysis.ultEfficiency.ultimateEfficiency >= 0.25
                      ? tRatings("good")
                      : analysis.ultEfficiency.ultimateEfficiency >= 0.15
                        ? tRatings("average")
                        : tRatings("poor")}
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
                    ? t("goodDiscipline")
                    : t("roomForImprovement")}
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
                {(analysis.ultEfficiency.dryFights > 0 ||
                  analysis.ultEfficiency.nonDryFights > 0) && (
                  <li>
                    Fight reversal rate (won after being down 2+ kills):{" "}
                    <span className="font-semibold tabular-nums">
                      {analysis.ultEfficiency.dryFightReversalRate.toFixed(1)}%
                    </span>{" "}
                    in dry fights vs{" "}
                    <span className="font-semibold tabular-nums">
                      {analysis.ultEfficiency.nonDryFightReversalRate.toFixed(
                        1
                      )}
                      %
                    </span>{" "}
                    when ultimates were used.
                    {analysis.ultEfficiency.dryFights > 0 &&
                      analysis.ultEfficiency.nonDryFights > 0 &&
                      (analysis.ultEfficiency.nonDryFightReversalRate >
                      analysis.ultEfficiency.dryFightReversalRate
                        ? " Ultimates are a key comeback tool for this team."
                        : " This team can reverse fights through raw mechanics.")}
                  </li>
                )}
              </>
            )}
          </ul>

          {hasCharts && (
            <div className="space-y-6">
              {hasComparisons && (
                <div className="min-h-[300px]">
                  <h5 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                    {tHeadings("usageBySubrole")}
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
                    {tHeadings("timingBreakdown")}
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

export function HeroSwapAnalysisSection({
  analysis,
}: {
  analysis: ScrimSwapAnalysis;
}) {
  const t = useTranslations("scrimPage.rawStatsSections.swaps");
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
      <section aria-label={t("label")}>
        <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          {t("title")}
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
              {t.rich("ourTopSwap", {
                fromHero: analysis.ourTopSwap.from,
                toHero: analysis.ourTopSwap.to,
                count: analysis.ourTopSwap.count,
                strong: (chunks: ReactNode) => (
                  <span className="font-semibold">{chunks}</span>
                ),
                n: (chunks: ReactNode) => (
                  <span className="font-semibold tabular-nums">{chunks}</span>
                ),
              })}
            </li>
          )}

          {analysis.opponentTopSwap && (
            <li>
              {t.rich("opponentTopSwap", {
                fromHero: analysis.opponentTopSwap.from,
                toHero: analysis.opponentTopSwap.to,
                count: analysis.opponentTopSwap.count,
                strong: (chunks: ReactNode) => (
                  <span className="font-semibold">{chunks}</span>
                ),
                n: (chunks: ReactNode) => (
                  <span className="font-semibold tabular-nums">{chunks}</span>
                ),
              })}
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
