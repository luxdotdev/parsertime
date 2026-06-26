"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { cn, toKebabCase, toTimestampWithHours } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";

type MapRow = {
  name: string;
  playtime: number;
  wins: number;
  losses: number;
  winrate: number;
};

type MapPerformanceTableProps = {
  topMaps: { name: string; playtime: number }[];
  winrates: Record<
    string,
    { totalWinrate: number; totalWins: number; totalLosses: number }
  >;
  bestMap?: { mapName: string; playtime: number; winrate: number };
  blindSpot?: { mapName: string; playtime: number; winrate: number };
  mapNames: Map<string, string>;
};

export function MapPerformanceTable({
  topMaps,
  winrates,
  bestMap,
  blindSpot,
  mapNames,
}: MapPerformanceTableProps) {
  const t = useTranslations("teamStatsPage.topMapsCard");
  const format = useFormatter();

  function formatPercent(value: number) {
    return format.number(value / 100, {
      style: "percent",
      maximumFractionDigits: 0,
    });
  }

  if (topMaps.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("performanceEyebrow")}
          title={t("performanceTitle")}
        />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const rows: MapRow[] = topMaps.map((m) => {
    const wr = winrates[m.name];
    return {
      name: m.name,
      playtime: m.playtime,
      wins: wr?.totalWins ?? 0,
      losses: wr?.totalLosses ?? 0,
      winrate: wr?.totalWinrate ?? 0,
    };
  });

  const maxPlaytime = Math.max(...rows.map((r) => r.playtime), 1);
  const bestKebab = bestMap ? toKebabCase(bestMap.mapName) : null;
  const blindKebab = blindSpot ? toKebabCase(blindSpot.mapName) : null;

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("performanceEyebrow")}
        title={t("performanceTitle")}
        description={t("performanceDescription")}
      />
      <div className="border-border overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="px-4 py-2 text-left font-medium">
                {t("columns.map")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("columns.games")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("columns.playtime")}
              </th>
              <th className="px-4 py-2 text-right font-medium">
                {t("columns.winrate")}
              </th>
              <th className="px-4 py-2 text-left font-medium">
                {t("columns.distribution")}
              </th>
              <th className="w-24 px-4 py-2 text-right font-medium">
                {t("columns.tag")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => {
              const kebab = toKebabCase(row.name);
              const totalGames = row.wins + row.losses;
              const widthPercentage = (row.playtime / maxPlaytime) * 100;
              const isBest = bestKebab === kebab;
              const isBlind = blindKebab === kebab;

              return (
                <tr
                  key={row.name}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="border-border relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                        <Image
                          src={`/maps/${kebab}.webp`}
                          alt={mapNames.get(kebab) ?? row.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="font-medium">
                        {mapNames.get(kebab) ?? row.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {format.number(totalGames)}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                    {toTimestampWithHours(row.playtime)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono font-semibold tabular-nums",
                      isBest && "text-primary",
                      isBlind && "text-destructive"
                    )}
                  >
                    {totalGames > 0 ? formatPercent(row.winrate) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="bg-muted h-1.5 w-full max-w-[140px] overflow-hidden rounded-full">
                      <div
                        className="bg-primary/60 h-full"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isBest ? (
                      <span className="bg-primary/15 text-primary rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                        {t("tags.strongest")}
                      </span>
                    ) : isBlind ? (
                      <span className="bg-destructive/15 text-destructive rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
                        {t("tags.bleed")}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
