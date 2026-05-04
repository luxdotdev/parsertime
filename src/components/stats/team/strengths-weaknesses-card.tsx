"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toKebabCase, toTimestampWithHours } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

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
  const t = useTranslations("teamStatsPage.strengthsWeaknessesCard");

  if (!bestMap && !blindSpot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best Map - Strength */}
        {bestMap && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-muted-foreground h-4 w-4" />
              <h3 className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
                {t("strongestMap")}
              </h3>
            </div>

            <div className="border-border relative h-32 overflow-hidden rounded-lg border">
              <Image
                src={`/maps/${toKebabCase(bestMap.mapName)}.webp`}
                alt={
                  mapNames.get(toKebabCase(bestMap.mapName)) ?? bestMap.mapName
                }
                fill
                className="object-cover brightness-[0.4]"
              />

              <div className="absolute inset-0 flex flex-col justify-between p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-lg font-bold text-white drop-shadow-lg">
                    {mapNames.get(toKebabCase(bestMap.mapName)) ??
                      bestMap.mapName}
                  </h4>
                  <span className="rounded-sm bg-white/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.16em] text-white uppercase tabular-nums backdrop-blur-sm">
                    {bestMap.winrate.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">
                    {t("playtime", {
                      time: toTimestampWithHours(bestMap.playtime),
                    })}
                  </span>
                  <span className="text-xs text-white/70">
                    {t("bestPerformance")}
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
              <TrendingDown className="text-muted-foreground h-4 w-4" />
              <h3 className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
                {t("blindSpot")}
              </h3>
            </div>

            <div className="border-border relative h-32 overflow-hidden rounded-lg border">
              <Image
                src={`/maps/${toKebabCase(blindSpot.mapName)}.webp`}
                alt={
                  mapNames.get(toKebabCase(blindSpot.mapName)) ??
                  blindSpot.mapName
                }
                fill
                className="object-cover brightness-[0.4]"
              />

              <div className="absolute inset-0 flex flex-col justify-between p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-lg font-bold text-white drop-shadow-lg">
                    {mapNames.get(toKebabCase(blindSpot.mapName)) ??
                      blindSpot.mapName}
                  </h4>
                  <span className="rounded-sm bg-white/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.16em] text-white uppercase tabular-nums backdrop-blur-sm">
                    {blindSpot.winrate.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">
                    {t("playtime", {
                      time: toTimestampWithHours(blindSpot.playtime),
                    })}
                  </span>
                  <span className="text-xs text-white/70">
                    {t("needsImprovement")}
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
