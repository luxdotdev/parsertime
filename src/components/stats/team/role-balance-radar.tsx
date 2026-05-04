"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type {
  RoleBalanceAnalysis,
  RolePerformanceStats,
} from "@/data/team/types";
import { cn, round } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

function CustomTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (active && payload?.length) {
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold">Role Balance</p>
        <p className="text-foreground font-mono text-xs tabular-nums">
          Tank: {round(payload[0].value as number)}
        </p>
        <p className="text-foreground font-mono text-xs tabular-nums">
          Damage: {round(payload[1].value as number)}
        </p>
        <p className="text-foreground font-mono text-xs tabular-nums">
          Support: {round(payload[2].value as number)}
        </p>
      </div>
    );
  }
}

type RoleBalanceRadarProps = {
  roleStats: RolePerformanceStats;
  balanceAnalysis: RoleBalanceAnalysis;
};

export function RoleBalanceRadar({
  roleStats,
  balanceAnalysis,
}: RoleBalanceRadarProps) {
  const t = useTranslations("teamStatsPage.roleBalanceRadar");

  const hasData = ["Tank", "Damage", "Support"].some(
    (role) => roleStats[role as keyof RolePerformanceStats].totalPlaytime > 0
  );

  function getBalanceBadgeClass(
    overall: RoleBalanceAnalysis["overall"]
  ): string {
    switch (overall) {
      case "Balanced":
        return "bg-primary/15 text-primary";
      case "Insufficient data":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  }

  const balanceBadge = (
    <span
      className={cn(
        "rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
        getBalanceBadgeClass(balanceAnalysis.overall)
      )}
    >
      {balanceAnalysis.overall}
    </span>
  );

  if (!hasData) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Overview · Role balance"
          title={t("title")}
          rightSlot={balanceBadge}
        />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  function normalizeKD(kd: number): number {
    return Math.min((kd / 3) * 100, 100);
  }

  function normalizeSurvivability(deathsPer10Min: number): number {
    return Math.max(0, 100 - deathsPer10Min * 4);
  }

  function normalizeUltUsage(ultEfficiency: number): number {
    return Math.min((ultEfficiency / 4) * 100, 100);
  }

  function normalizeActivity(totalPlaytime: number): number {
    return Math.min((totalPlaytime / 7200) * 100, 100);
  }

  const chartData = [
    {
      metric: t("eliminations"),
      Tank: normalizeKD(roleStats.Tank.kd),
      Damage: normalizeKD(roleStats.Damage.kd),
      Support: normalizeKD(roleStats.Support.kd),
    },
    {
      metric: t("survivability"),
      Tank: normalizeSurvivability(roleStats.Tank.deathsPer10Min),
      Damage: normalizeSurvivability(roleStats.Damage.deathsPer10Min),
      Support: normalizeSurvivability(roleStats.Support.deathsPer10Min),
    },
    {
      metric: t("ultUsage"),
      Tank: normalizeUltUsage(roleStats.Tank.ultEfficiency),
      Damage: normalizeUltUsage(roleStats.Damage.ultEfficiency),
      Support: normalizeUltUsage(roleStats.Support.ultEfficiency),
    },
    {
      metric: t("activity"),
      Tank: normalizeActivity(roleStats.Tank.totalPlaytime),
      Damage: normalizeActivity(roleStats.Damage.totalPlaytime),
      Support: normalizeActivity(roleStats.Support.totalPlaytime),
    },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Overview · Role balance"
        title={t("title")}
        rightSlot={balanceBadge}
      />
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar
            name={t("tank")}
            dataKey="Tank"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.4}
          />
          <Radar
            name={t("damage")}
            dataKey="Damage"
            stroke="var(--chart-3)"
            fill="var(--chart-3)"
            fillOpacity={0.4}
          />
          <Radar
            name={t("support")}
            dataKey="Support"
            stroke="var(--chart-5)"
            fill="var(--chart-5)"
            fillOpacity={0.4}
          />
          <Legend />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {balanceAnalysis.insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("insights")}
          </h4>
          <ul className="text-muted-foreground space-y-1 text-sm">
            {balanceAnalysis.insights.map((insight) => (
              <li key={insight} className="flex gap-2">
                <span>•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {balanceAnalysis.strongestRole && balanceAnalysis.weakestRole && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("strongest")}</span>
            <span className="text-foreground font-semibold">
              {balanceAnalysis.strongestRole}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("needsWork")}</span>
            <span className="text-foreground font-semibold">
              {balanceAnalysis.weakestRole}
            </span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">{t("balanceScore")}</span>
            <span className="text-foreground font-mono font-semibold tabular-nums">
              {(balanceAnalysis.balanceScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
