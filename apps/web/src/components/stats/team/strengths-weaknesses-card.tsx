"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { toKebabCase } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
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
  const format = useFormatter();

  function formatPercent(value: number): string {
    return format.number(value / 100, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  function formatPlaytime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);

    return t("durationHoursMinutesSeconds", {
      hours,
      minutes,
      seconds: remainingSeconds,
    });
  }

  if (!bestMap && !blindSpot) {
    return (
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
      <div className="grid gap-6 md:grid-cols-2">
        {bestMap && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-muted-foreground size-4" />
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
                    {formatPercent(bestMap.winrate)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">
                    {t("playtime", {
                      time: formatPlaytime(bestMap.playtime),
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

        {blindSpot && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="text-muted-foreground size-4" />
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
                    {formatPercent(blindSpot.winrate)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">
                    {t("playtime", {
                      time: formatPlaytime(blindSpot.playtime),
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
      </div>
    </section>
  );
}
