"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, toKebabCase, toTimestampWithHours } from "@/lib/utils";
import Image from "next/image";
import { TrendingUp, TrendingDown } from "lucide-react";

type StrengthsWeaknessesCardProps = {
  bestMap?: {
    mapName: string;
    playtime: number;
    winrate: number;
  };
  blindSpot?: {
    mapName: string;
    playtime: number;
    winrate: number;
  };
  mapNames: Map<string, string>;
};

export function StrengthsWeaknessesCard({
  bestMap,
  blindSpot,
  mapNames,
}: StrengthsWeaknessesCardProps) {
  if (!bestMap && !blindSpot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Strengths & Weaknesses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Not enough data to determine strengths and weaknesses yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Strengths & Weaknesses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best Map - Strength */}
        {bestMap && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-600 dark:text-green-400">
                Strongest Map
              </h3>
            </div>

            <div className="relative h-32 overflow-hidden rounded-lg border-2 border-green-500">
              <Image
                src={`/maps/${toKebabCase(bestMap.mapName)}.webp`}
                alt={mapNames.get(toKebabCase(bestMap.mapName)) ?? bestMap.mapName}
                fill
                className="object-cover brightness-[0.4]"
              />

              <div className="absolute inset-0 flex flex-col justify-between p-4">
                <div className="flex items-start justify-between">
                  <h4 className="text-lg font-bold text-white drop-shadow-lg">
                    {mapNames.get(toKebabCase(bestMap.mapName)) ?? bestMap.mapName}
                  </h4>
                  <Badge className="bg-green-500 text-white font-bold">
                    {bestMap.winrate.toFixed(1)}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">
                    {toTimestampWithHours(bestMap.playtime)} played
                  </span>
                  <span className="text-xs text-white/70">
                    Best performance
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blind Spot - Weakness */}
        {blindSpot && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-red-600 dark:text-red-400">
                Blind Spot
              </h3>
            </div>

            <div className="relative h-32 overflow-hidden rounded-lg border-2 border-red-500">
              <Image
                src={`/maps/${toKebabCase(blindSpot.mapName)}.webp`}
                alt={mapNames.get(toKebabCase(blindSpot.mapName)) ?? blindSpot.mapName}
                fill
                className="object-cover brightness-[0.4]"
              />

              <div className="absolute inset-0 flex flex-col justify-between p-4">
                <div className="flex items-start justify-between">
                  <h4 className="text-lg font-bold text-white drop-shadow-lg">
                    {mapNames.get(toKebabCase(blindSpot.mapName)) ?? blindSpot.mapName}
                  </h4>
                  <Badge className="bg-red-500 text-white font-bold">
                    {blindSpot.winrate.toFixed(1)}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">
                    {toTimestampWithHours(blindSpot.playtime)} played
                  </span>
                  <span className="text-xs text-white/70">
                    Needs improvement
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

