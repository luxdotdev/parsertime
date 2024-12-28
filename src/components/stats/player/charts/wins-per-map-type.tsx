"use client";

import { CardContent, CardFooter } from "@/components/ui/card";
import { Winrate } from "@/data/scrim-dto";
import { MapName, mapNameToMapTypeMapping } from "@/types/map";
import { useTranslations } from "next-intl";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type MapTypeData = {
  mapType: string;
  wins: number;
  total: number;
};

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
  if (active && payload && payload.length) {
    return (
      <div className="z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          <span className="text-blue-500">
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
    <>
      <CardContent>
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
            <PolarGrid />
            <PolarAngleAxis dataKey="mapType" />
            <PolarRadiusAxis angle={45} domain={[0, 100]} opacity={0.6} />
            <Radar
              name={t("chartName")}
              dataKey="winrate"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">{t("footer")}</p>
      </CardFooter>
    </>
  );
}
