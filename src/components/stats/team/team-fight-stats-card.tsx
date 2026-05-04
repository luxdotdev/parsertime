import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeamFightStats } from "@/data/team/types";
import { round } from "@/lib/utils";
import { useTranslations } from "next-intl";

type TeamFightStatsCardProps = {
  fightStats: TeamFightStats;
};

export function TeamFightStatsCard({ fightStats }: TeamFightStatsCardProps) {
  const t = useTranslations("teamStats.fightStats");

  if (fightStats.totalFights === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("noData")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const dryFightPercentage =
    fightStats.totalFights > 0
      ? (fightStats.dryFights / fightStats.totalFights) * 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { count: fightStats.totalFights })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Overall Fight Winrate */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              {t("overallWinrate")}
            </h4>
            <p className="text-foreground font-mono text-2xl font-bold tabular-nums">
              {round(fightStats.overallWinrate)}%
            </p>
            <p className="text-muted-foreground text-xs">
              {t("record", {
                wins: fightStats.fightsWon,
                losses: fightStats.fightsLost,
              })}
            </p>
          </div>

          {/* First Pick Winrate */}
          {fightStats.firstPickFights > 0 && (
            <div className="space-y-2">
              <h4 className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("firstPickWinrate")}
              </h4>
              <p className="text-foreground font-mono text-2xl font-bold tabular-nums">
                {round(fightStats.firstPickWinrate)}%
              </p>
              <p className="text-muted-foreground text-xs">
                {t("firstPickCount", { count: fightStats.firstPickFights })}
              </p>
            </div>
          )}

          {/* First Death Winrate */}
          {fightStats.firstDeathFights > 0 && (
            <div className="space-y-2">
              <h4 className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("firstDeathWinrate")}
              </h4>
              <p className="text-foreground font-mono text-2xl font-bold tabular-nums">
                {round(fightStats.firstDeathWinrate)}%
              </p>
              <p className="text-muted-foreground text-xs">
                {t("firstDeathCount", { count: fightStats.firstDeathFights })}
              </p>
            </div>
          )}

          {/* First Ultimate Winrate */}
          {fightStats.firstUltFights > 0 && (
            <div className="space-y-2">
              <h4 className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("firstUltWinrate")}
              </h4>
              <p className="text-foreground font-mono text-2xl font-bold tabular-nums">
                {round(fightStats.firstUltWinrate)}%
              </p>
              <p className="text-muted-foreground text-xs">
                {t("firstUltCount", { count: fightStats.firstUltFights })}
              </p>
            </div>
          )}

          {/* Dry Fight Stats */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              {t("dryFights")}
            </h4>
            <p className="text-foreground font-mono text-2xl font-bold tabular-nums">
              {round(dryFightPercentage)}%
            </p>
            <p className="text-muted-foreground text-xs">
              {t("dryFightDetails", {
                count: fightStats.dryFights,
                winrate: round(fightStats.dryFightWinrate),
              })}
            </p>
          </div>

          {/* Average Ultimates Per Fight */}
          {fightStats.nonDryFights > 0 && (
            <div className="space-y-2">
              <h4 className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("avgUltsPerFight")}
              </h4>
              <p className="text-foreground font-mono text-2xl font-bold tabular-nums">
                {round(fightStats.avgUltsPerNonDryFight)}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("avgUltsDescription", {
                  count: fightStats.nonDryFights,
                })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
