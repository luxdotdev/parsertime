"use client";

import { UltTimingChart } from "@/components/charts/ult-timing-chart";
import { Callout } from "@/components/map/analysis/callout";
import { EfficiencyScorecard } from "@/components/map/analysis/efficiency-scorecard";
import { HeadToHeadBar } from "@/components/map/analysis/head-to-head-bar";
import { FightWinRateChart } from "@/components/scrim/fight-win-rate-chart";
import { PlayerPerformanceTable } from "@/components/scrim/player-performance-table";
import { SwapWinRateChart } from "@/components/scrim/swap-win-rate-chart";
import { UltComparisonChart } from "@/components/scrim/ult-comparison-chart";
import type {
  PlayerScrimPerformance,
  ScrimFightAnalysis,
  ScrimSwapAnalysis,
  ScrimUltAnalysis,
} from "@/data/scrim/types";
import { ArrowRightLeft, Swords, Users, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type TeamPair = {
  team1: { name: string; color: string };
  team2: { name: string; color: string };
};

export function ScrimFightsSection({
  analysis,
  team1,
  team2,
}: TeamPair & { analysis: ScrimFightAnalysis }) {
  const t = useTranslations("scrimPage.overviewSections.fights");

  if (analysis.totalFights === 0) {
    return (
      <p className="text-muted-foreground text-sm text-pretty">{t("noData")}</p>
    );
  }

  const fightsLost = analysis.totalFights - analysis.fightsWon;

  function b(chunks: ReactNode) {
    return <span className="font-semibold tabular-nums">{chunks}</span>;
  }

  return (
    <div className="space-y-4">
      <Callout icon={<Swords className="size-4" />}>
        {t.rich("summary", {
          b,
          winrate: Math.round(analysis.fightWinrate),
          total: analysis.totalFights,
          won: analysis.fightsWon,
          lost: fightsLost,
        })}
      </Callout>

      <HeadToHeadBar
        label={t("labels.fightsWon")}
        team1Value={analysis.fightsWon}
        team2Value={fightsLost}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit={t("units.fights")}
      />

      {analysis.firstPickCount > 0 && (
        <HeadToHeadBar
          label={t("labels.firstPickRate")}
          team1Value={analysis.firstPickCount}
          team2Value={analysis.totalFights - analysis.firstPickCount}
          team1Name={team1.name}
          team2Name={team2.name}
          team1Color={team1.color}
          team2Color={team2.color}
          unit={t("units.fights")}
        />
      )}

      <HeadToHeadBar
        label={t("labels.firstDeathRate")}
        team1Value={analysis.teamFirstDeathCount}
        team2Value={analysis.totalFights - analysis.teamFirstDeathCount}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit={t("units.firstDeaths")}
      />

      <div>
        <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          {t("headings.conditionalWinRates")}
        </h4>
        <FightWinRateChart analysis={analysis} />
      </div>

      {(analysis.firstUltCount > 0 || analysis.opponentFirstUltCount > 0) && (
        <Callout icon={<Zap className="size-4" />}>
          {analysis.firstUltCount > 0 && (
            <>
              {t.rich("firstUlt", {
                b,
                count: analysis.firstUltCount,
                winrate: Math.round(analysis.firstUltWinrate),
              })}
            </>
          )}
          {analysis.firstUltCount > 0 &&
            analysis.opponentFirstUltCount > 0 &&
            " "}
          {analysis.opponentFirstUltCount > 0 && (
            <>
              {t.rich("opponentFirstUlt", {
                b,
                count: analysis.opponentFirstUltCount,
                winrate: Math.round(analysis.opponentFirstUltWinrate),
              })}
            </>
          )}
        </Callout>
      )}
    </div>
  );
}

export function ScrimUltimatesSection({
  analysis,
  team1,
  team2,
}: TeamPair & { analysis: ScrimUltAnalysis }) {
  const t = useTranslations("scrimPage.overviewSections.ultimates");

  if (analysis.ourUltsUsed === 0 && analysis.opponentUltsUsed === 0) {
    return (
      <p className="text-muted-foreground text-sm text-pretty">{t("noData")}</p>
    );
  }

  const eff = analysis.ultEfficiency;
  const hasComparisons = analysis.playerComparisons.length > 0;
  const allOurTimings = analysis.ultsByRole.flatMap((r) => r.ourSubroleTimings);
  const allOpponentTimings = analysis.ultsByRole.flatMap(
    (r) => r.opponentSubroleTimings
  );
  const hasTimingData =
    allOurTimings.length > 0 || allOpponentTimings.length > 0;
  const teamNames = [team1.name, team2.name] as const;

  function b(chunks: ReactNode) {
    return <span className="font-semibold tabular-nums">{chunks}</span>;
  }

  const ratingLabel =
    eff.ultimateEfficiency >= 0.4
      ? t("ratings.excellent")
      : eff.ultimateEfficiency >= 0.25
        ? t("ratings.good")
        : eff.ultimateEfficiency >= 0.15
          ? t("ratings.average")
          : t("ratings.poor");

  return (
    <div className="space-y-4">
      {eff.totalUltsUsedInFights > 0 && (
        <Callout icon={<Zap className="size-4" />}>
          {t.rich("efficiency", {
            b,
            value: eff.ultimateEfficiency.toFixed(2),
            rating: ratingLabel,
          })}
        </Callout>
      )}

      <HeadToHeadBar
        label={t("labels.totalUltimatesUsed")}
        team1Value={analysis.ourUltsUsed}
        team2Value={analysis.opponentUltsUsed}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit={t("units.ults")}
      />

      {analysis.ultsByRole
        .filter((r) => r.ourCount > 0 || r.opponentCount > 0)
        .map((r) => (
          <HeadToHeadBar
            key={r.role}
            label={t("labels.roleUltimates", { role: r.role })}
            team1Value={r.ourCount}
            team2Value={r.opponentCount}
            team1Name={team1.name}
            team2Name={team2.name}
            team1Color={team1.color}
            team2Color={team2.color}
            unit={t("units.ults")}
          />
        ))}

      {eff.totalUltsUsedInFights > 0 && (
        <EfficiencyScorecard
          teamName={team1.name}
          teamColor={team1.color}
          efficiency={eff}
        />
      )}

      {hasComparisons && (
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            {t("headings.usageBySubrole")}
          </h4>
          <UltComparisonChart
            comparisons={analysis.playerComparisons}
            teamNames={teamNames}
          />
        </div>
      )}

      {hasTimingData && (
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            {t("headings.timingBreakdown")}
          </h4>
          <UltTimingChart
            team1Timings={allOurTimings}
            team2Timings={allOpponentTimings}
            teamNames={teamNames}
          />
        </div>
      )}
    </div>
  );
}

export function ScrimSwapsSection({
  analysis,
  team1,
  team2,
}: TeamPair & { analysis: ScrimSwapAnalysis }) {
  const t = useTranslations("scrimPage.overviewSections.swaps");

  if (analysis.ourSwaps === 0 && analysis.opponentSwaps === 0) {
    return (
      <p className="text-muted-foreground text-sm text-pretty">{t("noData")}</p>
    );
  }

  const swapTotal = analysis.swapWins + analysis.swapLosses;
  const noSwapTotal = analysis.noSwapWins + analysis.noSwapLosses;

  function b(chunks: ReactNode) {
    return <span className="font-semibold tabular-nums">{chunks}</span>;
  }

  return (
    <div className="space-y-4">
      <Callout icon={<ArrowRightLeft className="size-4" />}>
        {t.rich("summary", {
          b,
          swaps: analysis.ourSwaps,
          perMap: analysis.ourSwapsPerMap.toFixed(1),
          opponentSwaps: analysis.opponentSwaps,
        })}
      </Callout>

      <HeadToHeadBar
        label={t("labels.totalHeroSwaps")}
        team1Value={analysis.ourSwaps}
        team2Value={analysis.opponentSwaps}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit={t("units.swaps")}
      />

      {swapTotal > 0 && noSwapTotal > 0 && (
        <HeadToHeadBar
          label={t("labels.swapVsNoSwapWinRate")}
          team1Value={analysis.swapWinrate}
          team2Value={analysis.noSwapWinrate}
          team1Name={t("labels.withSwaps")}
          team2Name={t("labels.withoutSwaps")}
          team1Color={team1.color}
          team2Color={team2.color}
          format="percentage"
        />
      )}

      <div>
        <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          {t("headings.winRateBySwapCountTiming")}
        </h4>
        <SwapWinRateChart
          swapCountBuckets={analysis.winrateBySwapCount}
          timingBuckets={analysis.timingOutcomes}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {analysis.ourTopSwap && (
          <Callout icon={<ArrowRightLeft className="size-4" />}>
            {t.rich("topSwap", {
              b: (chunks) => <span className="font-semibold">{chunks}</span>,
              n: (chunks) => <span className="tabular-nums">{chunks}</span>,
              fromHero: analysis.ourTopSwap.from,
              toHero: analysis.ourTopSwap.to,
              count: analysis.ourTopSwap.count,
            })}
          </Callout>
        )}
        {analysis.topSwapper && (
          <Callout icon={<Users className="size-4" />}>
            {t.rich("topSwapper", {
              b: (chunks) => <span className="font-semibold">{chunks}</span>,
              n: (chunks) => <span className="tabular-nums">{chunks}</span>,
              playerName: analysis.topSwapper.playerName,
              swaps: analysis.topSwapper.count,
              maps: analysis.topSwapper.mapsCount,
            })}
          </Callout>
        )}
      </div>
    </div>
  );
}

export function ScrimPlayersSection({
  players,
}: {
  players: PlayerScrimPerformance[];
}) {
  return <PlayerPerformanceTable players={players} />;
}
