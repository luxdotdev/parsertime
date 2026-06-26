"use client";

import { UltTimingChart } from "@/components/charts/ult-timing-chart";
import { SectionHeader } from "@/components/stats/team/section-header";
import type { TeamUltStats } from "@/data/team/types";
import { useTranslations } from "next-intl";

type UltRoleBreakdownCardProps = {
  ultStats: TeamUltStats;
};

export function UltRoleBreakdownCard({ ultStats }: UltRoleBreakdownCardProps) {
  const t = useTranslations("teamStatsPage.ultimatesTab.roleBreakdown");

  if (ultStats.totalUltsUsed === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("noData")}
        />
      </section>
    );
  }

  const allTimings = ultStats.roleBreakdown.flatMap((r) => r.subroleTimings);
  const hasTimingData = allTimings.some((tt) => tt.count > 0);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="border-border overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              <th className="px-4 py-2 text-left font-medium">{t("role")}</th>
              <th className="px-4 py-2 text-right font-medium">
                {t("ultsUsed")}
              </th>
              <th className="px-4 py-2 text-right font-medium">{t("share")}</th>
              <th className="px-4 py-2 text-left font-medium">
                {t("subroles")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {ultStats.roleBreakdown.map((role) => (
              <tr
                key={role.role}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="text-foreground px-4 py-3 font-medium">
                  {role.role}
                </td>
                <td className="text-foreground px-4 py-3 text-right font-mono font-semibold tabular-nums">
                  {role.count}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right font-mono tabular-nums">
                  {t("percentage", { value: role.percentage.toFixed(1) })}
                </td>
                <td className="px-4 py-3">
                  {role.subroleTimings.length > 0 ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {role.subroleTimings.map((sr) => (
                        <span
                          key={sr.subrole}
                          className="text-muted-foreground"
                        >
                          {sr.subrole}{" "}
                          <span className="text-foreground font-mono tabular-nums">
                            {sr.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/60 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasTimingData && (
        <div className="space-y-3">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {t("timingTitle")}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("timingDescription")}
            </p>
          </div>
          <UltTimingChart
            team1Timings={allTimings}
            team2Timings={[]}
            teamNames={[t("yourTeam"), ""] as const}
          />
        </div>
      )}
    </section>
  );
}
