"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toKebabCase, toTimestampWithHours } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

type TopMapsCardProps = {
  topMaps: {
    name: string;
    playtime: number;
  }[];
  winrates: Record<
    string,
    {
      totalWinrate: number;
      totalWins: number;
      totalLosses: number;
    }
  >;
  mapNames: Map<string, string>;
};

export function TopMapsCard({ topMaps, winrates, mapNames }: TopMapsCardProps) {
  const t = useTranslations("teamStatsPage.topMapsCard");

  if (topMaps.length === 0) {
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

  const maxPlaytime = Math.max(...topMaps.map((m) => m.playtime));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topMaps.map((map, index) => {
            const kebabName = toKebabCase(map.name);
            const winrateData = winrates[map.name];
            const winrate = winrateData?.totalWinrate ?? 0;
            const widthPercentage = (map.playtime / maxPlaytime) * 100;

            return (
              <div key={map.name} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border">
                    <Image
                      src={`/maps/${kebabName}.webp`}
                      alt={mapNames.get(kebabName) ?? map.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {index + 1}. {mapNames.get(kebabName) ?? map.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {winrateData && (
                          <span className="text-foreground font-mono font-semibold tabular-nums">
                            {winrate.toFixed(1)}%
                          </span>
                        )}
                        <span className="text-muted-foreground font-mono tabular-nums">
                          {toTimestampWithHours(map.playtime)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary/60 h-full transition-all"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
