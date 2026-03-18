"use client";

import { UltTimingChart } from "@/components/charts/ult-timing-chart";
import { Callout } from "@/components/map/analysis/callout";
import { EfficiencyScorecard } from "@/components/map/analysis/efficiency-scorecard";
import { HeadToHeadBar } from "@/components/map/analysis/head-to-head-bar";
import { UltComparisonChart } from "@/components/scrim/ult-comparison-chart";
import type {
  PlayerUltComparison,
  SubroleUltTiming,
  UltEfficiency,
} from "@/data/scrim-overview-dto";
import type { RoleName } from "@/types/heroes";
import {
  FirstDeathTimeline,
  type FightFirstDeath,
} from "@/components/map/analysis/first-death-timeline";
import { Crosshair, Skull, Zap } from "lucide-react";

type TeamPair = {
  team1: { name: string; color: string };
  team2: { name: string; color: string };
};

export type DeathsData = {
  team1FirstDeaths: number;
  totalFights: number;
  playerWithMostFirstDeaths: string;
  playerFirstDeathCount: number;
  playerTeamColor: string;
  lucioAjaxes: { playerName: string; count: number; teamColor: string }[];
  fightFirstDeaths: FightFirstDeath[];
};

export type UltimatesData = {
  team1Count: number;
  team2Count: number;
  team1Kills: number;
  team2Kills: number;
  firstUltByRole: Record<
    RoleName,
    { team1First: number; team2First: number; total: number }
  >;
  team1TopUlt: { name: string; hero: string; count: number } | null;
  team2TopUlt: { name: string; hero: string; count: number } | null;
  team1TopFightInitiator: { hero: string; count: number } | null;
  team2TopFightInitiator: { hero: string; count: number } | null;
  team1InitiatedWithUlt: number;
  team2InitiatedWithUlt: number;
  fightsWithUltsCount: number;
  playerComparisons: PlayerUltComparison[];
};

export type TimingData = {
  team1AllTimings: SubroleUltTiming[];
  team2AllTimings: SubroleUltTiming[];
};

export type EfficiencyData = {
  team1: UltEfficiency;
  team2: UltEfficiency;
  team1AvgChargeTime: number;
  team2AvgChargeTime: number;
  team1AvgHoldTime: number;
  team2AvgHoldTime: number;
};

export type SwapsData = {
  team1Count: number;
  team2Count: number;
  team1TopPair: { from: string; to: string; count: number } | null;
  team2TopPair: { from: string; to: string; count: number } | null;
  team1TopSwapper: { name: string; count: number } | null;
  team2TopSwapper: { name: string; count: number } | null;
};

const ROLES: RoleName[] = ["Tank", "Damage", "Support"];

export function DeathsSection({
  team1,
  team2,
  deaths,
}: TeamPair & { deaths: DeathsData }) {
  return (
    <div className="space-y-4">
      <HeadToHeadBar
        label="First Death Rate"
        team1Value={deaths.team1FirstDeaths}
        team2Value={deaths.totalFights - deaths.team1FirstDeaths}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit="first deaths"
      />
      <Callout icon={<Skull className="size-4" />}>
        Player with most first deaths:{" "}
        <span
          className="font-semibold"
          style={{ color: deaths.playerTeamColor }}
        >
          {deaths.playerWithMostFirstDeaths}
        </span>{" "}
        <span className="tabular-nums">
          ({deaths.playerFirstDeathCount} of {deaths.totalFights} fights)
        </span>
      </Callout>
      {deaths.fightFirstDeaths.length > 0 && (
        <FirstDeathTimeline
          fights={deaths.fightFirstDeaths}
          team1={team1}
          team2={team2}
        />
      )}
      {deaths.lucioAjaxes.map((ajax) => (
        <Callout key={ajax.playerName} icon="🎵">
          <span className="font-semibold" style={{ color: ajax.teamColor }}>
            {ajax.playerName}
          </span>{" "}
          played Lúcio and Ajaxed{" "}
          <span className="font-semibold tabular-nums">{ajax.count}</span>{" "}
          {ajax.count === 1 ? "time" : "times"}
        </Callout>
      ))}
    </div>
  );
}

export function UltimatesSection({
  team1,
  team2,
  ultimates,
}: TeamPair & { ultimates: UltimatesData }) {
  return (
    <div className="space-y-4">
      <HeadToHeadBar
        label="Total Ultimates Used"
        team1Value={ultimates.team1Count}
        team2Value={ultimates.team2Count}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit="ults"
      />
      {ROLES.map((role) => {
        const data = ultimates.firstUltByRole[role];
        if (data.total === 0) return null;
        return (
          <HeadToHeadBar
            key={role}
            label={`${role} — Used Ult First`}
            team1Value={data.team1First}
            team2Value={data.team2First}
            team1Name={team1.name}
            team2Name={team2.name}
            team1Color={team1.color}
            team2Color={team2.color}
            unit="fights"
          />
        );
      })}
      <div className="grid gap-3 sm:grid-cols-2">
        {ultimates.team1TopUlt && (
          <Callout icon={<Zap className="size-4" />}>
            <span style={{ color: team1.color }}>Top ult user:</span>{" "}
            <span className="font-semibold">{ultimates.team1TopUlt.name}</span>{" "}
            ({ultimates.team1TopUlt.hero},{" "}
            <span className="tabular-nums">{ultimates.team1TopUlt.count}</span>)
          </Callout>
        )}
        {ultimates.team2TopUlt && (
          <Callout icon={<Zap className="size-4" />}>
            <span style={{ color: team2.color }}>Top ult user:</span>{" "}
            <span className="font-semibold">{ultimates.team2TopUlt.name}</span>{" "}
            ({ultimates.team2TopUlt.hero},{" "}
            <span className="tabular-nums">{ultimates.team2TopUlt.count}</span>)
          </Callout>
        )}
      </div>
      {ultimates.fightsWithUltsCount > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ultimates.team1TopFightInitiator && (
            <Callout icon={<Crosshair className="size-4" />}>
              <span style={{ color: team1.color }}>Top fight opener:</span>{" "}
              <span className="font-semibold">
                {ultimates.team1TopFightInitiator.hero}
              </span>{" "}
              (
              <span className="tabular-nums">
                {ultimates.team1TopFightInitiator.count}
              </span>{" "}
              {ultimates.team1TopFightInitiator.count === 1
                ? "fight"
                : "fights"}
              )
            </Callout>
          )}
          {ultimates.team2TopFightInitiator && (
            <Callout icon={<Crosshair className="size-4" />}>
              <span style={{ color: team2.color }}>Top fight opener:</span>{" "}
              <span className="font-semibold">
                {ultimates.team2TopFightInitiator.hero}
              </span>{" "}
              (
              <span className="tabular-nums">
                {ultimates.team2TopFightInitiator.count}
              </span>{" "}
              {ultimates.team2TopFightInitiator.count === 1
                ? "fight"
                : "fights"}
              )
            </Callout>
          )}
        </div>
      )}
      {ultimates.playerComparisons.length > 0 && (
        <div className="min-h-[300px]">
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            Ultimate Usage by Subrole
          </h4>
          <UltComparisonChart
            comparisons={ultimates.playerComparisons}
            teamNames={[team1.name, team2.name] as const}
          />
        </div>
      )}
    </div>
  );
}

export function TimingSection({
  team1,
  team2,
  timing,
}: TeamPair & { timing: TimingData }) {
  if (
    timing.team1AllTimings.length === 0 &&
    timing.team2AllTimings.length === 0
  )
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        No timing data available for this map.
      </p>
    );

  const t1Init = timing.team1AllTimings.reduce((s, t) => s + t.initiation, 0);
  const t1Total = timing.team1AllTimings.reduce((s, t) => s + t.count, 0);
  const t2Init = timing.team2AllTimings.reduce((s, t) => s + t.initiation, 0);
  const t2Total = timing.team2AllTimings.reduce((s, t) => s + t.count, 0);
  const t1Pct = t1Total > 0 ? ((t1Init / t1Total) * 100).toFixed(0) : "0";
  const t2Pct = t2Total > 0 ? ((t2Init / t2Total) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-4">
      <Callout icon={<Crosshair className="size-4" />}>
        <span style={{ color: team1.color }}>{team1.name}</span> uses{" "}
        <span className="font-semibold tabular-nums">{t1Pct}%</span> of ults in
        initiation vs <span style={{ color: team2.color }}>{team2.name}</span>
        &apos;s <span className="font-semibold tabular-nums">{t2Pct}%</span>
      </Callout>
      <div className="min-h-[300px]">
        <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          Ultimate Timing Breakdown
        </h4>
        <UltTimingChart
          team1Timings={timing.team1AllTimings}
          team2Timings={timing.team2AllTimings}
          teamNames={[team1.name, team2.name] as const}
        />
      </div>
    </div>
  );
}

export function EfficiencySection({
  team1,
  team2,
  efficiency,
}: TeamPair & { efficiency: EfficiencyData }) {
  if (
    efficiency.team1.totalUltsUsedInFights === 0 &&
    efficiency.team2.totalUltsUsedInFights === 0
  )
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        No efficiency data available for this map.
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {efficiency.team1.totalUltsUsedInFights > 0 && (
          <EfficiencyScorecard
            teamName={team1.name}
            teamColor={team1.color}
            efficiency={efficiency.team1}
          />
        )}
        {efficiency.team2.totalUltsUsedInFights > 0 && (
          <EfficiencyScorecard
            teamName={team2.name}
            teamColor={team2.color}
            efficiency={efficiency.team2}
          />
        )}
      </div>
      {(efficiency.team1AvgChargeTime > 0 ||
        efficiency.team2AvgChargeTime > 0) && (
        <HeadToHeadBar
          label="Avg Ult Charge Time"
          team1Value={efficiency.team1AvgChargeTime}
          team2Value={efficiency.team2AvgChargeTime}
          team1Name={team1.name}
          team2Name={team2.name}
          team1Color={team1.color}
          team2Color={team2.color}
          format="time"
        />
      )}
      {(efficiency.team1AvgHoldTime > 0 || efficiency.team2AvgHoldTime > 0) && (
        <HeadToHeadBar
          label="Avg Ult Hold Time"
          team1Value={efficiency.team1AvgHoldTime}
          team2Value={efficiency.team2AvgHoldTime}
          team1Name={team1.name}
          team2Name={team2.name}
          team1Color={team1.color}
          team2Color={team2.color}
          format="time"
        />
      )}
    </div>
  );
}

export function SwapsSection({
  team1,
  team2,
  swaps,
}: TeamPair & { swaps: SwapsData }) {
  if (swaps.team1Count === 0 && swaps.team2Count === 0)
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        No hero swaps recorded for this map.
      </p>
    );

  return (
    <div className="space-y-4">
      <HeadToHeadBar
        label="Total Hero Swaps"
        team1Value={swaps.team1Count}
        team2Value={swaps.team2Count}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit="swaps"
      />
      <div className="overflow-hidden rounded-lg border border-black/[0.06] shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.2)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-muted-foreground px-3 py-2 text-left text-xs font-medium" />
              <th
                className="px-3 py-2 text-left text-xs font-semibold"
                style={{ color: team1.color }}
              >
                {team1.name}
              </th>
              <th
                className="px-3 py-2 text-left text-xs font-semibold"
                style={{ color: team2.color }}
              >
                {team2.name}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="text-muted-foreground px-3 py-2 text-xs font-medium">
                Top Swap
              </td>
              <td className="px-3 py-2 font-medium tabular-nums">
                {swaps.team1TopPair
                  ? `${swaps.team1TopPair.from} → ${swaps.team1TopPair.to} (${swaps.team1TopPair.count}x)`
                  : "—"}
              </td>
              <td className="px-3 py-2 font-medium tabular-nums">
                {swaps.team2TopPair
                  ? `${swaps.team2TopPair.from} → ${swaps.team2TopPair.to} (${swaps.team2TopPair.count}x)`
                  : "—"}
              </td>
            </tr>
            <tr>
              <td className="text-muted-foreground px-3 py-2 text-xs font-medium">
                Most Active
              </td>
              <td className="px-3 py-2 font-medium tabular-nums">
                {swaps.team1TopSwapper
                  ? `${swaps.team1TopSwapper.name} (${swaps.team1TopSwapper.count} swaps)`
                  : "—"}
              </td>
              <td className="px-3 py-2 font-medium tabular-nums">
                {swaps.team2TopSwapper
                  ? `${swaps.team2TopSwapper.name} (${swaps.team2TopSwapper.count} swaps)`
                  : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
