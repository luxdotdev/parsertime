"use client";

import { CardContent, CardFooter } from "@/components/ui/card";
import { Winrate } from "@/data/scrim-dto";
import { cn, toTitleCase } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import {
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

function processMapWinrates(mapWinrates: Winrate): Data {
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
    name: toTitleCase(mapName),
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
  if (active && payload && payload.length) {
    const percentage =
      ((payload[0].value as number) /
        ((payload[0].value as number) + (payload[1].value as number))) *
      100;

    return (
      <div className="z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          Wins:{" "}
          <span className="text-blue-500">{payload[0].value as number}</span>
        </p>
        <p className="text-sm">
          Losses:{" "}
          <span className="text-red-500">{payload[1].value as number}</span>
        </p>
        <p className="text-sm">
          Percentage:{" "}
          <span
            className={cn(percentage >= 50 ? "text-green-500" : "text-red-500")}
          >
            {percentage.toFixed(2)}%
          </span>
        </p>
      </div>
    );
  }

  return null;
}

import React from "react";
import { MapName, mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";

type Props = {
  data: Winrate;
};

export function MapWinsChart({ data }: Props) {
  const processedData = processMapWinrates(data);

  return (
    <>
      <CardContent>
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              interval={0} // Ensures all labels are displayed
              angle={-45} // Rotates the labels
              textAnchor="end" // Adjusts the anchor for readability
              height={60} // Adjusts height to accommodate rotated labels
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend layout="vertical" verticalAlign="top" align="left" />
            <Bar dataKey="wins" name="Wins" stackId="a" fill="#3b82f6" />
            <Bar
              dataKey="losses"
              name="Losses"
              stackId="a"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Map winrates are calculated based on the number of wins and losses for
          each map. Please note that Push maps are not included in this chart as
          they do not have a way to track their win/loss condition.
        </p>
      </CardFooter>
    </>
  );
}
