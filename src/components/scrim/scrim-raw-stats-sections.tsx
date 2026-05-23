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

  function strong(chunks: ReactNode) {
    return <span className="font-semibold">{chunks}</span>;
  }

  function number(chunks: ReactNode) {
    return <span className="font-semibold tabular-nums">{chunks}</span>;
  }

  function greenNumber(chunks: ReactNode) {
    return (
      <span className="font-semibold text-green-600 tabular-nums dark:text-green-400">
        {chunks}
      </span>
    );
  }

  function redNumber(chunks: ReactNode) {
    return (
      <span className="font-semibold text-red-600 tabular-nums dark:text-red-400">
        {chunks}
      </span>
    );
  }

  function colored(className: string) {
    function Colored(chunks: ReactNode) {
      return <span className={className}>{chunks}</span>;
    }
    return Colored;
  }

  function rate(value: number, favorable: boolean) {
    function Rate(_chunks: ReactNode) {
      return <HighlightedPct value={value} favorable={favorable} />;
    }
    return Rate;
  }

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
              {t.rich("ultUsage", {
                ourCount: analysis.ourUltsUsed,
                opponentCount: analysis.opponentUltsUsed,
                n: number,
              })}
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
                    {t.rich("roleUltUsage", {
                      role: r.role,
                      ourCount: r.ourCount,
                      opponentCount: r.opponentCount,
                      n: number,
                    })}
                    {r.ourFirstRate > 0 && (
                      <>
                        {" "}
                        {t.rich("roleFirstUlt", {
                          role: r.role.toLowerCase(),
                          rateValue: Math.round(r.ourFirstRate),
                          rate: rate(r.ourFirstRate, r.ourFirstRate >= 50),
                        })}
                      </>
                    )}
                    {r.ourSubroleTimings.length > 0 && (
                      <ul className="text-muted-foreground mt-1 ml-4 space-y-0.5 text-xs">
                        {r.ourSubroleTimings.map((sr) => (
                          <li key={sr.subrole}>
                            {t.rich("subroleTiming", {
                              subrole: sr.subrole,
                              count: sr.count,
                              pct:
                                totalSubroleUlts > 0
                                  ? (
                                      (sr.count / totalSubroleUlts) *
                                      100
                                    ).toFixed(0)
                                  : 0,
                              initiation: sr.initiation,
                              midfight: sr.midfight,
                              late: sr.late,
                              n: colored(
                                "text-foreground font-semibold tabular-nums"
                              ),
                              init: colored("text-green-500"),
                              mid: colored("text-yellow-500"),
                              lateText: colored("text-red-500"),
                            })}
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
                  {t.rich("fightInitiations", {
                    rateValue: Math.round(
                      (analysis.ourFightInitiations / analysis.fightsWithUlts) *
                        100
                    ),
                    initiations: analysis.ourFightInitiations,
                    total: analysis.fightsWithUlts,
                    rate: rate(
                      (analysis.ourFightInitiations / analysis.fightsWithUlts) *
                        100,
                      analysis.ourFightInitiations >=
                        analysis.opponentFightInitiations
                    ),
                    n: number,
                  })}
                </li>
                {analysis.ourTopFightInitiator && (
                  <li>
                    {t.rich("ourTopFightInitiator", {
                      hero: analysis.ourTopFightInitiator.hero,
                      count: analysis.ourTopFightInitiator.count,
                      strong,
                      n: number,
                    })}
                  </li>
                )}
                {analysis.opponentTopFightInitiator && (
                  <li>
                    {t.rich("opponentTopFightInitiator", {
                      hero: analysis.opponentTopFightInitiator.hero,
                      count: analysis.opponentTopFightInitiator.count,
                      strong,
                      n: number,
                    })}
                  </li>
                )}
              </>
            )}

            {analysis.topUltUser && (
              <li>
                {t.rich("topUltUser", {
                  playerName: analysis.topUltUser.playerName,
                  hero: analysis.topUltUser.hero,
                  count: analysis.topUltUser.count,
                  strong,
                  n: number,
                })}
              </li>
            )}

            {(analysis.avgChargeTime > 0 || analysis.avgHoldTime > 0) && (
              <li>
                {analysis.avgChargeTime > 0 && analysis.avgHoldTime > 0
                  ? t.rich("avgChargeAndHold", {
                      chargeTime: analysis.avgChargeTime.toFixed(1),
                      holdTime: analysis.avgHoldTime.toFixed(1),
                      n: number,
                    })
                  : analysis.avgChargeTime > 0
                    ? t.rich("avgCharge", {
                        chargeTime: analysis.avgChargeTime.toFixed(1),
                        n: number,
                      })
                    : t.rich("avgHold", {
                        holdTime: analysis.avgHoldTime.toFixed(1),
                        n: number,
                      })}
              </li>
            )}

            {analysis.ultEfficiency.totalUltsUsedInFights > 0 && (
              <>
                <li>
                  {t.rich("ultimateEfficiency", {
                    value: analysis.ultEfficiency.ultimateEfficiency.toFixed(2),
                    rating:
                      analysis.ultEfficiency.ultimateEfficiency >= 0.4
                        ? tRatings("excellent")
                        : analysis.ultEfficiency.ultimateEfficiency >= 0.25
                          ? tRatings("good")
                          : analysis.ultEfficiency.ultimateEfficiency >= 0.15
                            ? tRatings("average")
                            : tRatings("poor"),
                    n: number,
                  })}
                </li>
                <li>
                  {t.rich("averageUltsPerFight", {
                    won: analysis.ultEfficiency.avgUltsInWonFights.toFixed(1),
                    lost: analysis.ultEfficiency.avgUltsInLostFights.toFixed(1),
                    discipline:
                      analysis.ultEfficiency.avgUltsInWonFights >
                      analysis.ultEfficiency.avgUltsInLostFights
                        ? t("goodDiscipline")
                        : t("roomForImprovement"),
                    wonValue: greenNumber,
                    lostValue: redNumber,
                  })}
                </li>
                {analysis.ultEfficiency.wastedUltimates > 0 && (
                  <li>
                    {t.rich("wastedUltimates", {
                      count: analysis.ultEfficiency.wastedUltimates,
                      percent: (
                        (analysis.ultEfficiency.wastedUltimates /
                          analysis.ultEfficiency.totalUltsUsedInFights) *
                        100
                      ).toFixed(1),
                      n: number,
                    })}
                  </li>
                )}
                <li>
                  {t.rich("dryNonDryFights", {
                    dryCount: analysis.ultEfficiency.dryFights,
                    dryRate: analysis.ultEfficiency.dryFightWinrate.toFixed(1),
                    nonDryCount: analysis.ultEfficiency.nonDryFights,
                    nonDryRate:
                      analysis.ultEfficiency.nonDryFights > 0
                        ? (
                            (analysis.ultEfficiency.fightsWon /
                              analysis.ultEfficiency.nonDryFights) *
                            100
                          ).toFixed(1)
                        : "0.0",
                    n: number,
                  })}
                </li>
                {(analysis.ultEfficiency.dryFights > 0 ||
                  analysis.ultEfficiency.nonDryFights > 0) && (
                  <li>
                    {t.rich("fightReversal", {
                      dryRate:
                        analysis.ultEfficiency.dryFightReversalRate.toFixed(1),
                      nonDryRate:
                        analysis.ultEfficiency.nonDryFightReversalRate.toFixed(
                          1
                        ),
                      insight:
                        analysis.ultEfficiency.dryFights > 0 &&
                        analysis.ultEfficiency.nonDryFights > 0
                          ? analysis.ultEfficiency.nonDryFightReversalRate >
                            analysis.ultEfficiency.dryFightReversalRate
                            ? "comeback"
                            : "mechanics"
                          : "none",
                      n: number,
                    })}
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
