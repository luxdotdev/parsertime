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
  ScrimInsight,
  ScrimSwapAnalysis,
  ScrimUltAnalysis,
} from "@/data/scrim/types";
import { ArrowRightLeft, Swords, Users, Zap } from "lucide-react";

type TeamPair = {
  team1: { name: string; color: string };
  team2: { name: string; color: string };
};

export function ScrimFightsSection({
  analysis,
  team1,
  team2,
}: TeamPair & { analysis: ScrimFightAnalysis }) {
  if (analysis.totalFights === 0) {
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        No fight data available for this scrim.
      </p>
    );
  }

  const fightsLost = analysis.totalFights - analysis.fightsWon;

  return (
    <div className="space-y-4">
      <Callout icon={<Swords className="size-4" />}>
        Won{" "}
        <span className="font-semibold tabular-nums">
          {Math.round(analysis.fightWinrate)}%
        </span>{" "}
        of{" "}
        <span className="font-semibold tabular-nums">
          {analysis.totalFights}
        </span>{" "}
        fights ({analysis.fightsWon}W &ndash; {fightsLost}L)
      </Callout>

      <HeadToHeadBar
        label="Fights Won"
        team1Value={analysis.fightsWon}
        team2Value={fightsLost}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit="fights"
      />

      {analysis.firstPickCount > 0 && (
        <HeadToHeadBar
          label="First Pick Rate"
          team1Value={analysis.firstPickCount}
          team2Value={analysis.totalFights - analysis.firstPickCount}
          team1Name={team1.name}
          team2Name={team2.name}
          team1Color={team1.color}
          team2Color={team2.color}
          unit="fights"
        />
      )}

      <HeadToHeadBar
        label="First Death Rate"
        team1Value={analysis.teamFirstDeathCount}
        team2Value={analysis.totalFights - analysis.teamFirstDeathCount}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit="first deaths"
      />

      <div>
        <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          Conditional Win Rates
        </h4>
        <FightWinRateChart analysis={analysis} />
      </div>

      {(analysis.firstUltCount > 0 || analysis.opponentFirstUltCount > 0) && (
        <Callout icon={<Zap className="size-4" />}>
          {analysis.firstUltCount > 0 && (
            <>
              Used ults first in{" "}
              <span className="font-semibold tabular-nums">
                {analysis.firstUltCount}
              </span>{" "}
              fights (
              <span className="font-semibold tabular-nums">
                {Math.round(analysis.firstUltWinrate)}%
              </span>{" "}
              WR).
            </>
          )}
          {analysis.firstUltCount > 0 &&
            analysis.opponentFirstUltCount > 0 &&
            " "}
          {analysis.opponentFirstUltCount > 0 && (
            <>
              Opponent used ults first in{" "}
              <span className="font-semibold tabular-nums">
                {analysis.opponentFirstUltCount}
              </span>{" "}
              fights (
              <span className="font-semibold tabular-nums">
                {Math.round(analysis.opponentFirstUltWinrate)}%
              </span>{" "}
              WR).
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
  if (analysis.ourUltsUsed === 0 && analysis.opponentUltsUsed === 0) {
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        No ultimate data available for this scrim.
      </p>
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

  const ratingLabel =
    eff.ultimateEfficiency >= 0.4
      ? "Excellent"
      : eff.ultimateEfficiency >= 0.25
        ? "Good"
        : eff.ultimateEfficiency >= 0.15
          ? "Average"
          : "Poor";

  return (
    <div className="space-y-4">
      {eff.totalUltsUsedInFights > 0 && (
        <Callout icon={<Zap className="size-4" />}>
          Ultimate efficiency:{" "}
          <span className="font-semibold tabular-nums">
            {eff.ultimateEfficiency.toFixed(2)}
          </span>{" "}
          fights won per ult ({ratingLabel})
        </Callout>
      )}

      <HeadToHeadBar
        label="Total Ultimates Used"
        team1Value={analysis.ourUltsUsed}
        team2Value={analysis.opponentUltsUsed}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit="ults"
      />

      {analysis.ultsByRole
        .filter((r) => r.ourCount > 0 || r.opponentCount > 0)
        .map((r) => (
          <HeadToHeadBar
            key={r.role}
            label={`${r.role} Ultimates`}
            team1Value={r.ourCount}
            team2Value={r.opponentCount}
            team1Name={team1.name}
            team2Name={team2.name}
            team1Color={team1.color}
            team2Color={team2.color}
            unit="ults"
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
            Ultimate Usage by Subrole
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
            Ultimate Timing Breakdown
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
  if (analysis.ourSwaps === 0 && analysis.opponentSwaps === 0) {
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        No hero swap data available for this scrim.
      </p>
    );
  }

  const swapTotal = analysis.swapWins + analysis.swapLosses;
  const noSwapTotal = analysis.noSwapWins + analysis.noSwapLosses;

  return (
    <div className="space-y-4">
      <Callout icon={<ArrowRightLeft className="size-4" />}>
        <span className="font-semibold tabular-nums">{analysis.ourSwaps}</span>{" "}
        swaps across all maps (
        <span className="tabular-nums">
          {analysis.ourSwapsPerMap.toFixed(1)}/map
        </span>
        ) vs opponent&apos;s{" "}
        <span className="font-semibold tabular-nums">
          {analysis.opponentSwaps}
        </span>
      </Callout>

      <HeadToHeadBar
        label="Total Hero Swaps"
        team1Value={analysis.ourSwaps}
        team2Value={analysis.opponentSwaps}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit="swaps"
      />

      {swapTotal > 0 && noSwapTotal > 0 && (
        <HeadToHeadBar
          label="Swap vs No-Swap Win Rate"
          team1Value={analysis.swapWinrate}
          team2Value={analysis.noSwapWinrate}
          team1Name="With Swaps"
          team2Name="Without Swaps"
          team1Color={team1.color}
          team2Color={team2.color}
          format="percentage"
        />
      )}

      <div>
        <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          Win Rate by Swap Count &amp; Timing
        </h4>
        <SwapWinRateChart
          swapCountBuckets={analysis.winrateBySwapCount}
          timingBuckets={analysis.timingOutcomes}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {analysis.ourTopSwap && (
          <Callout icon={<ArrowRightLeft className="size-4" />}>
            Top swap:{" "}
            <span className="font-semibold">{analysis.ourTopSwap.from}</span>{" "}
            &rarr;{" "}
            <span className="font-semibold">{analysis.ourTopSwap.to}</span> (
            <span className="tabular-nums">{analysis.ourTopSwap.count}x</span>)
          </Callout>
        )}
        {analysis.topSwapper && (
          <Callout icon={<Users className="size-4" />}>
            Most active swapper:{" "}
            <span className="font-semibold">
              {analysis.topSwapper.playerName}
            </span>{" "}
            (
            <span className="tabular-nums">
              {analysis.topSwapper.count} swaps, {analysis.topSwapper.mapsCount}{" "}
              {analysis.topSwapper.mapsCount === 1 ? "map" : "maps"}
            </span>
            )
          </Callout>
        )}
      </div>
    </div>
  );
}

export function ScrimPlayersSection({
  players,
  insights,
}: {
  players: PlayerScrimPerformance[];
  insights: ScrimInsight[];
}) {
  const mvpInsight = insights.find(
    (i) => i.type === "mvp" || i.type === "outlier_positive"
  );

  return (
    <div className="space-y-4">
      {mvpInsight && (
        <Callout icon={<Users className="size-4" />}>
          {mvpInsight.headline}
        </Callout>
      )}
      <PlayerPerformanceTable players={players} />
    </div>
  );
}
