"use client";

import { UltTimingChart } from "@/components/charts/ult-timing-chart";
import { Callout } from "@/components/map/analysis/callout";
import { EfficiencyScorecard } from "@/components/map/analysis/efficiency-scorecard";
import {
  FirstDeathTimeline,
  type FightFirstDeath,
} from "@/components/map/analysis/first-death-timeline";
import { HeadToHeadBar } from "@/components/map/analysis/head-to-head-bar";
import { useGoToReplay } from "@/components/map/map-tabs";
import { KillPositionCard } from "@/components/positional/kill-position-card";
import { useKillCalibration } from "@/components/positional/use-kill-calibration";
import { UltComparisonChart } from "@/components/scrim/ult-comparison-chart";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { SerializedCalibrationData } from "@/data/killfeed-calibration-dto";
import type {
  PlayerUltComparison,
  SubroleUltTiming,
  UltEfficiency,
} from "@/data/scrim/types";
import { toHero, toKebabCase, toTimestamp } from "@/lib/utils";
import type { RoleName } from "@/types/heroes";
import type { Kill } from "@prisma/client";
import { Crosshair, Route, Skull, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

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

export type RotationDeathNearbyPlayer = {
  playerName: string;
  playerTeam: string;
  hero: string;
  x: number;
  z: number;
};

export type RotationDeathEvent = {
  kill: Kill;
  fightIndex: number;
  fightKills: Kill[];
  preFightDamageCount: number;
  killDistance: number | null;
  nearbyPlayers?: RotationDeathNearbyPlayer[];
};

export type RotationDeathsData = {
  team1Count: number;
  team2Count: number;
  totalFights: number;
  events: RotationDeathEvent[];
  playerBreakdown: {
    playerName: string;
    playerTeam: string;
    rotationDeathCount: number;
    totalDeaths: number;
    rotationDeathRate: number;
  }[];
} | null;

export function RotationDeathsSection({
  team1,
  team2,
  rotationDeaths,
  calibrationData,
}: TeamPair & {
  rotationDeaths: RotationDeathsData;
  calibrationData?: SerializedCalibrationData;
}) {
  if (!rotationDeaths)
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        No coordinate data available for rotation death analysis on this map.
      </p>
    );

  const { team1Count, team2Count, events, playerBreakdown } = rotationDeaths;

  if (events.length === 0)
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        No rotation deaths detected on this map.
      </p>
    );

  const sorted = [...playerBreakdown]
    .filter((p) => p.rotationDeathCount > 0)
    .sort((a, b) => b.rotationDeathCount - a.rotationDeathCount);
  const topPlayer = sorted[0];

  const diedToMap = new Map<string, number>();
  for (const e of events) {
    const hero = e.kill.attacker_hero;
    diedToMap.set(hero, (diedToMap.get(hero) ?? 0) + 1);
  }
  const topKiller = [...diedToMap.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <HeadToHeadBar
        label="Rotation Deaths"
        team1Value={team1Count}
        team2Value={team2Count}
        team1Name={team1.name}
        team2Name={team2.name}
        team1Color={team1.color}
        team2Color={team2.color}
        unit="deaths"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {topPlayer && (
          <Callout icon={<Route className="size-4" />}>
            Most picked on rotation:{" "}
            <span
              className="font-semibold"
              style={{
                color:
                  topPlayer.playerTeam === team1.name
                    ? team1.color
                    : team2.color,
              }}
            >
              {topPlayer.playerName}
            </span>{" "}
            <span className="tabular-nums">
              ({topPlayer.rotationDeathCount} of {topPlayer.totalDeaths} deaths,{" "}
              {(topPlayer.rotationDeathRate * 100).toFixed(0)}%)
            </span>
          </Callout>
        )}
        {topKiller && (
          <Callout icon={<Crosshair className="size-4" />}>
            Most rotation picks with:{" "}
            <span className="font-semibold">{topKiller[0]}</span>{" "}
            <span className="tabular-nums">
              ({topKiller[1]} {topKiller[1] === 1 ? "kill" : "kills"})
            </span>
          </Callout>
        )}
      </div>

      {/* Per-player breakdown table */}
      {sorted.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-black/[0.06] shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.2)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-muted-foreground px-3 py-2 text-left text-xs font-medium">
                  Player
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right text-xs font-medium">
                  Rotation Deaths
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right text-xs font-medium">
                  Total Deaths
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right text-xs font-medium">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((p) => (
                <tr key={`${p.playerName}::${p.playerTeam}`}>
                  <td
                    className="px-3 py-2 font-medium"
                    style={{
                      color:
                        p.playerTeam === team1.name ? team1.color : team2.color,
                    }}
                  >
                    {p.playerName}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {p.rotationDeathCount}
                  </td>
                  <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                    {p.totalDeaths}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(p.rotationDeathRate * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Individual rotation death events */}
      <div>
        <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          Rotation Death Events ({events.length})
        </h4>
        <div className="space-y-1">
          {events.map((e) => (
            <RotationDeathRow
              key={`${e.kill.id}-${e.kill.match_time}`}
              event={e}
              team1={team1}
              team2={team2}
              calibrationData={calibrationData}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RotationDeathRow({
  event,
  team1,
  team2,
  calibrationData,
}: {
  event: RotationDeathEvent;
  team1: { name: string; color: string };
  team2: { name: string; color: string };
  calibrationData?: SerializedCalibrationData;
}) {
  const { kill, fightKills, killDistance } = event;
  const t = useTranslations("mapPage.killfeedTable");
  const goToReplay = useGoToReplay();

  const calibration = useKillCalibration(
    kill.match_time,
    calibrationData ?? null
  );
  const hasCoords =
    calibration && kill.attacker_x != null && kill.victim_x != null;

  const attackerColor =
    kill.attacker_team === team1.name ? team1.color : team2.color;
  const victimColor =
    kill.victim_team === team1.name ? team1.color : team2.color;

  const abilityName =
    kill.event_ability === "0"
      ? t("abilities.primary-fire")
      : t(`abilities.${toKebabCase(kill.event_ability)}`);

  const rowContent = (
    <div className="bg-muted/30 hover:bg-muted/60 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors">
      {calibrationData ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground w-14 shrink-0 cursor-pointer text-xs tabular-nums underline-offset-2 hover:underline"
          title="View in Replay"
          onClick={(e) => {
            e.stopPropagation();
            goToReplay(kill.match_time);
          }}
        >
          {toTimestamp(kill.match_time)}
        </button>
      ) : (
        <span className="text-muted-foreground w-14 shrink-0 text-xs tabular-nums">
          {toTimestamp(kill.match_time)}
        </span>
      )}

      <span className="flex items-center gap-1.5">
        <Image
          src={`/heroes/${toHero(kill.attacker_hero)}.png`}
          alt=""
          width={64}
          height={64}
          className="size-6 rounded-full"
          style={{ border: `2px solid ${attackerColor}` }}
        />
        <span className="font-medium" style={{ color: attackerColor }}>
          {kill.attacker_name}
        </span>
      </span>

      <span className="text-muted-foreground text-xs">{abilityName}</span>

      <span className="flex items-center gap-1.5">
        <Image
          src={`/heroes/${toHero(kill.victim_hero)}.png`}
          alt=""
          width={64}
          height={64}
          className="size-6 rounded-full grayscale"
          style={{ border: `2px solid ${victimColor}` }}
        />
        <span className="font-medium" style={{ color: victimColor }}>
          {kill.victim_name}
        </span>
      </span>

      {killDistance != null && (
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {killDistance.toFixed(0)}m
        </span>
      )}
    </div>
  );

  if (hasCoords) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button type="button" className="w-full cursor-pointer text-left">
            {rowContent}
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="top" align="center" className="w-auto p-0">
          <KillPositionCard
            kill={kill}
            fightKills={fightKills}
            calibration={calibration}
            team1={team1.name}
            team1Color={team1.color}
            team2Color={team2.color}
            abilityName={abilityName}
            nearbyPlayers={event.nearbyPlayers}
          />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return rowContent;
}
