"use client";

import { PlayerStatsRadarChart } from "@/components/charts/leaderboard/player-stats-radar-chart";
import { SRDistributionChart } from "@/components/charts/leaderboard/sr-distribution-chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useFormatter, useTranslations } from "next-intl";

type LeaderboardPlayer = {
  composite_sr: number;
  player_name: string;
  rank: number;
  percentile: string;
  role: string;
  hero: string;
  elims_per10?: number;
  fb_per10?: number;
  deaths_per10: number;
  damage_per10: number;
  healing_per10?: number;
  blocked_per10?: number;
  solo_per10?: number;
  ults_per10?: number;
  maps: number;
  minutes_played: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  player: LeaderboardPlayer | null;
  leaderboardData: LeaderboardPlayer[];
};

export function PlayerStatsSheet({
  isOpen,
  onClose,
  player,
  leaderboardData,
}: Props) {
  const t = useTranslations("leaderboardPage.csr.stats");
  const formatter = useFormatter();

  if (!player) return null;

  const percentile = parseFloat(player.percentile);
  function getPercentileDescription(pct: number) {
    if (pct >= 99) return t("percentile.top1");
    if (pct >= 95) return t("percentile.top5");
    if (pct >= 90) return t("percentile.top10");
    if (pct >= 75) return t("percentile.top25");
    if (pct >= 50) return t("percentile.aboveAverage");
    if (pct >= 25) return t("percentile.average");
    return t("percentile.belowAverage");
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-2xl">{player.player_name}</SheetTitle>
          <SheetDescription>
            {t("sheetMeta", {
              rank: player.rank,
              hero: player.hero,
              role: getRoleLabel(player.role, t),
            })}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">
                  {t("compositeSr")}
                </p>
                <p className="text-3xl font-bold">
                  {formatter.number(player.composite_sr)}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">
                  {t("percentileLabel")}
                </p>
                <p className="text-3xl font-bold">
                  {formatter.number(percentile / 100, {
                    style: "percent",
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {getPercentileDescription(percentile)}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">{t("maps")}</p>
                <p className="text-2xl font-semibold">
                  {formatter.number(player.maps)}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">{t("time")}</p>
                <p className="text-2xl font-semibold">
                  {t("minutes", { count: Math.round(player.minutes_played) })}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 text-lg font-semibold">
                {t("srDistribution")}
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("distributionDescription", {
                  playerName: player.player_name,
                })}
              </p>
              <SRDistributionChart
                leaderboardData={leaderboardData}
                selectedPlayer={player}
              />
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 text-lg font-semibold">
                {t("performanceBreakdown")}
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("performanceDescription", {
                  playerName: player.player_name,
                })}
              </p>
              <PlayerStatsRadarChart
                player={player}
                leaderboardData={leaderboardData}
              />
            </div>

            <Separator />

            <div className="bg-muted space-y-2 rounded-lg p-4">
              <h4 className="text-sm font-semibold">{t("detailedStats")}</h4>
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {player.elims_per10 !== undefined && (
                  <div>
                    <span className="text-muted-foreground">
                      {t("statLabel", { label: t("per10.eliminations") })}
                    </span>{" "}
                    <span className="font-mono">
                      {formatter.number(player.elims_per10, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                {player.fb_per10 !== undefined && (
                  <div>
                    <span className="text-muted-foreground">
                      {t("statLabel", { label: t("per10.finalBlows") })}
                    </span>{" "}
                    <span className="font-mono">
                      {formatter.number(player.fb_per10, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">
                    {t("statLabel", { label: t("per10.deaths") })}
                  </span>{" "}
                  <span className="font-mono">
                    {formatter.number(player.deaths_per10, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("statLabel", { label: t("per10.damage") })}
                  </span>{" "}
                  <span className="font-mono">
                    {formatter.number(Math.round(player.damage_per10))}
                  </span>
                </div>
                {player.healing_per10 !== undefined &&
                  player.healing_per10 > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        {t("statLabel", { label: t("per10.healing") })}
                      </span>{" "}
                      <span className="font-mono">
                        {formatter.number(Math.round(player.healing_per10))}
                      </span>
                    </div>
                  )}
                {player.blocked_per10 !== undefined &&
                  player.blocked_per10 > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        {t("statLabel", { label: t("per10.blocked") })}
                      </span>{" "}
                      <span className="font-mono">
                        {formatter.number(Math.round(player.blocked_per10))}
                      </span>
                    </div>
                  )}
                {player.solo_per10 !== undefined && (
                  <div>
                    <span className="text-muted-foreground">
                      {t("statLabel", { label: t("per10.soloKills") })}
                    </span>{" "}
                    <span className="font-mono">
                      {formatter.number(player.solo_per10, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                {player.ults_per10 !== undefined && (
                  <div>
                    <span className="text-muted-foreground">
                      {t("statLabel", { label: t("per10.ultimates") })}
                    </span>{" "}
                    <span className="font-mono">
                      {formatter.number(player.ults_per10, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function getRoleLabel(role: string, t: ReturnType<typeof useTranslations>) {
  switch (role.toLowerCase()) {
    case "tank":
      return t("roles.tank");
    case "damage":
      return t("roles.damage");
    case "support":
      return t("roles.support");
    default:
      return role;
  }
}
