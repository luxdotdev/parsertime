"use client";

import type { Winrate } from "@/data/scrim/types";
import { cn, toKebabCase, toTitleCase, useMapNames } from "@/lib/utils";
import { type MapName, mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type Data = {
  name: string;
  wins: number;
  losses: number;
}[];

// Mapping of special variants to their standard counterparts
const mapVariantMapping: Record<string, string> = {
  "Lijiang Tower (Lunar New Year)": "Lijiang Tower",
  "King's Row (Winter)": "King's Row",
  "Blizzard World (Winter)": "Blizzard World",
  "Eichenwalde (Halloween)": "Eichenwalde",
  "Hollywood (Halloween)": "Hollywood",
};

const WIN_COLOR = "var(--primary)";
const LOSS_COLOR = "var(--destructive)";

function processMapWinrates(
  mapWinrates: Winrate,
  maps: Map<string, string>
): Data {
  const mapData: Record<string, { wins: number; losses: number }> = {};

  mapWinrates.forEach((winrate) => {
    // Normalize the map name
    const mapName = mapVariantMapping[winrate.map] || winrate.map;

    if (!mapName) {
      return;
    }

    if (mapNameToMapTypeMapping[mapName as MapName] === $Enums.MapType.Push) {
      return;
    }

    if (!mapData[mapName]) {
      mapData[mapName] = { wins: 0, losses: 0 };
    }

    if (winrate.wins === 1) {
      mapData[mapName].wins += 1;
    } else {
      mapData[mapName].losses += 1;
    }
  });

  const data: Data = Object.keys(mapData).map((mapName) => ({
    name: toTitleCase(maps.get(toKebabCase(mapName)) ?? mapName),
    wins: mapData[mapName].wins,
    losses: mapData[mapName].losses,
  }));

  return data;
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("statsPage.playerStats.mapWinrates");

  if (active && payload?.length) {
    const percentage =
      ((payload[0].value as number) /
        ((payload[0].value as number) + (payload[1].value as number))) *
      100;

    return (
      <div className="bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          {t("tooltip.wins")}{" "}
          <span style={{ color: WIN_COLOR }}>{payload[0].value as number}</span>
        </p>
        <p className="text-sm">
          {t("tooltip.losses")}{" "}
          <span className="text-muted-foreground">
            {payload[1].value as number}
          </span>
        </p>
        <p className="text-sm">
          {t("tooltip.percentage")}{" "}
          <span
            className={cn(
              percentage >= 50 ? "text-primary" : "text-destructive",
              "font-mono tabular-nums"
            )}
          >
            {percentage.toFixed(2)}%
          </span>
        </p>
      </div>
    );
  }

  return null;
}

type Props = {
  data: Winrate;
};

export function MapWinsChart({ data }: Props) {
  const t = useTranslations("statsPage.playerStats.mapWinrates");
  const maps = useMapNames();
  const processedData = processMapWinrates(data, maps);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          width={500}
          height={400}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 70,
          }}
          data={processedData}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend layout="vertical" verticalAlign="top" align="left" />
          <Bar dataKey="wins" name={t("wins")} stackId="a" fill={WIN_COLOR} />
          <Bar
            dataKey="losses"
            name={t("losses")}
            stackId="a"
            fill={LOSS_COLOR}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-muted-foreground text-sm">{t("footer")}</p>
    </div>
  );
}
