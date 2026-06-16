"use client";

import type { OpponentMatchup } from "@/data/map/player-telemetry-types";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { toHero } from "@/lib/utils";
import Image from "next/image";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type Props = {
  opponents: OpponentMatchup[];
  playerTeam: "Team1" | "Team2";
  labels: { dealt: string; received: string };
};

type Datum = {
  opponent: string;
  hero: string;
  dealt: number;
  received: number;
};

export function OpponentRadarChart({ opponents, playerTeam, labels }: Props) {
  const { team1, team2 } = useColorblindMode();
  const dealtColor = playerTeam === "Team1" ? team1 : team2;
  const receivedColor = playerTeam === "Team1" ? team2 : team1;

  const data: Datum[] = opponents.map((o) => ({
    opponent: o.name,
    hero: o.hero,
    dealt: o.dealt,
    received: o.received,
  }));

  return (
    <div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-3 rounded-full"
            style={{ backgroundColor: dealtColor }}
            aria-hidden="true"
          />
          {labels.dealt}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-3 rounded-full"
            style={{ backgroundColor: receivedColor }}
            aria-hidden="true"
          />
          {labels.received}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={290}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="opponent"
            tick={{
              fill: "var(--muted-foreground)",
              fontSize: 11,
              fontFamily: "var(--font-geist-mono, ui-monospace)",
            }}
          />
          <PolarRadiusAxis tick={false} axisLine={false} />
          <Radar
            name={labels.received}
            dataKey="received"
            stroke={receivedColor}
            fill={receivedColor}
            fillOpacity={0.16}
            strokeWidth={1.5}
          />
          <Radar
            name={labels.dealt}
            dataKey="dealt"
            stroke={dealtColor}
            fill={dealtColor}
            fillOpacity={0.22}
            strokeWidth={1.5}
          />
          <Tooltip
            content={
              <RadarTooltip
                labels={labels}
                dealtColor={dealtColor}
                receivedColor={receivedColor}
              />
            }
            cursor={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RadarTooltip({
  active,
  payload,
  labels,
  dealtColor,
  receivedColor,
}: TooltipProps<ValueType, NameType> & {
  labels: { dealt: string; received: string };
  dealtColor: string;
  receivedColor: string;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload as Datum;

  return (
    <div className="bg-popover text-popover-foreground border-border rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-1.5">
        {datum.hero && (
          <Image
            src={`/heroes/${toHero(datum.hero)}.png`}
            alt=""
            width={40}
            height={40}
            className="size-4 rounded-sm"
          />
        )}
        <span className="text-foreground font-medium">{datum.opponent}</span>
      </div>
      <dl className="mt-1.5 space-y-0.5">
        <Row color={dealtColor} label={labels.dealt} value={datum.dealt} />
        <Row
          color={receivedColor}
          label={labels.received}
          value={datum.received}
        />
      </dl>
    </div>
  );
}

function Row({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground flex items-center gap-1.5">
        <span
          className="inline-block size-2 rounded-[2px]"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        {label}
      </dt>
      <dd className="font-mono tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}
