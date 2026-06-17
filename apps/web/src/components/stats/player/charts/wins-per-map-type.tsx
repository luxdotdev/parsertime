"use client";

import type { Winrate } from "@/data/scrim/types";
import { type MapName, mapNameToMapTypeMapping } from "@/types/map";
import { useTranslations } from "next-intl";
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

type MapTypeData = {
  mapType: string;
  wins: number;
  total: number;
};

const RADAR_COLOR = "var(--chart-1)";

function processMapWinrates(
  mapWinrates: Winrate,
  t: ReturnType<typeof useTranslations>
) {
  const mapTypeData: Record<string, MapTypeData> = {};

  mapWinrates.forEach((winrate) => {
    // Normalize the map name
    const mapName = winrate.map;

    // Filter out undefined map names
    if (!mapName) {
      return;
    }

    const mapType = mapNameToMapTypeMapping[mapName as MapName];
    if (!mapType || mapType === "Push") {
      return;
    }

    if (!mapTypeData[mapType]) {
      mapTypeData[mapType] = { mapType, wins: 0, total: 0 };
    }

    mapTypeData[mapType].total += 1;
    if (winrate.wins === 1) {
      mapTypeData[mapType].wins += 1;
    }
  });

  const data = Object.values(mapTypeData).map((item) => ({
    mapType: t(`mapTypes.${item.mapType}`),
    winrate: (item.wins / item.total) * 100,
  }));

  return data;
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (active && payload?.length) {
    return (
      <div className="bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          <span
            className="font-mono tabular-nums"
            style={{ color: RADAR_COLOR }}
          >
            {(payload[0].value as number).toFixed(2)}%
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

export function WinsPerMapTypeChart({ data }: Props) {
  const t = useTranslations("statsPage.playerStats.winrateMapType");
  const processedData = processMapWinrates(data, t);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart
          width={500}
          height={400}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          data={processedData}
        >
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="mapType"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={45}
            domain={[0, 100]}
            opacity={0.6}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Radar
            name={t("chartName")}
            dataKey="winrate"
            stroke={RADAR_COLOR}
            fill={RADAR_COLOR}
            fillOpacity={0.6}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-muted-foreground text-sm">{t("footer")}</p>
    </div>
  );
}
