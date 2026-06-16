"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { useTempoReadLabel } from "@/components/stats/team/use-tempo-read-label";
import type { QuickWinsStats } from "@/data/team/types";
import type { TempoBaselineStat } from "@/lib/tempo/classify";
import { cn } from "@/lib/utils";
import { CalendarCheck, Clock, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

type QuickStatsCardProps = {
  stats: QuickWinsStats;
  fightBaseline?: TempoBaselineStat | null;
};

const eyebrowClass =
  "text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase";

export function QuickStatsCard({ stats, fightBaseline }: QuickStatsCardProps) {
  const t = useTranslations("teamStatsPage.quickStatsCard");
  const tempoLabel = useTempoReadLabel();
  const fightSub = tempoLabel(stats.averageFightDuration, fightBaseline);

  function formatFightDuration(seconds: number | null): string {
    if (seconds === null) return t("notAvailable");
    return t("durationSeconds", { seconds: seconds.toFixed(1) });
  }

  function formatDay(day: string): string {
    return t(`days.${day.toLowerCase()}`);
  }

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <div className={cn("flex items-center gap-2", eyebrowClass)}>
            <Trophy className="text-muted-foreground size-4" />
            <span>{t("last10Games")}</span>
          </div>
          <div className="space-y-1">
            <div className="text-primary font-mono text-3xl font-bold tabular-nums">
              {stats.last10GamesPerformance.winrate.toFixed(0)}%
            </div>
            <div className="text-muted-foreground text-xs">
              {t("winsLossesRecord", {
                wins: stats.last10GamesPerformance.wins,
                losses: stats.last10GamesPerformance.losses,
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className={cn("flex items-center gap-2", eyebrowClass)}>
            <CalendarCheck className="text-muted-foreground size-4" />
            <span>{t("bestDay")}</span>
          </div>
          {stats.bestDayOfWeek ? (
            <div className="space-y-1">
              <div className="text-foreground font-mono text-3xl font-bold tabular-nums">
                {formatDay(stats.bestDayOfWeek.day)}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
                    stats.bestDayOfWeek.winrate >= 60
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {t("winrateShort", {
                    winrate: stats.bestDayOfWeek.winrate.toFixed(0),
                  })}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("gamesLabel", {
                    count: stats.bestDayOfWeek.gamesPlayed,
                  })}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              {t.rich("notEnoughData", {
                span: (chunks) => <span className="text-xs">{chunks}</span>,
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className={cn("flex items-center gap-2", eyebrowClass)}>
            <Clock className="text-muted-foreground size-4" />
            <span>{t("avgFightDuration")}</span>
          </div>
          <div className="space-y-1">
            <div className="text-foreground font-mono text-3xl font-bold tabular-nums">
              {formatFightDuration(stats.averageFightDuration)}
            </div>
            {fightSub !== null && (
              <div className="text-muted-foreground text-xs">{fightSub}</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className={cn("flex items-center gap-2", eyebrowClass)}>
            <Trophy className="text-muted-foreground size-4" />
            <span>{t("firstPickSuccess")}</span>
          </div>
          {stats.firstPickSuccessRate ? (
            <div className="space-y-1">
              <div className="text-foreground font-mono text-3xl font-bold tabular-nums">
                {stats.firstPickSuccessRate.successRate.toFixed(0)}%
              </div>
              <div className="text-muted-foreground text-xs">
                {t("firstPickSuccessRate", {
                  successfulFirstPicks:
                    stats.firstPickSuccessRate.successfulFirstPicks,
                  totalFirstPicks: stats.firstPickSuccessRate.totalFirstPicks,
                })}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">{t("noData")}</div>
          )}
        </div>
      </div>
    </section>
  );
}
