"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type {
  QuickWinsStats,
  RoleBalanceAnalysis,
  RolePerformanceStats,
} from "@/data/team/types";
import { cn, round, toKebabCase } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";
import {
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

type Insight = {
  eyebrow: string;
  headline: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
};

type OverviewInsightsBandProps = {
  quickStats: QuickWinsStats;
  roleStats: RolePerformanceStats;
  roleBalance: RoleBalanceAnalysis;
  bestMap?: { mapName: string; playtime: number; winrate: number };
  blindSpot?: { mapName: string; playtime: number; winrate: number };
  mapNames: Map<string, string>;
};

function CustomTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  const tBalance = useTranslations("teamStatsPage.roleBalanceRadar");

  if (!active || !payload?.length) return null;
  const metric = (payload[0]?.payload as { metric?: string } | undefined)
    ?.metric;
  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold">{metric}</p>
      <p className="text-foreground font-mono text-xs tabular-nums">
        {tBalance("tank")}: {round(payload[0].value as number)}
      </p>
      <p className="text-foreground font-mono text-xs tabular-nums">
        {tBalance("damage")}: {round(payload[1].value as number)}
      </p>
      <p className="text-foreground font-mono text-xs tabular-nums">
        {tBalance("support")}: {round(payload[2].value as number)}
      </p>
    </div>
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

export function OverviewInsightsBand({
  quickStats,
  roleStats,
  roleBalance,
  bestMap,
  blindSpot,
  mapNames,
}: OverviewInsightsBandProps) {
  const t = useTranslations("teamStatsPage.overviewInsightsBand");
  const tBalance = useTranslations("teamStatsPage.roleBalanceRadar");
  const formatter = useFormatter();

  const insights: Insight[] = [];

  const roleEntries = (["Tank", "Damage", "Support"] as const).filter(
    (r) => roleStats[r].totalPlaytime > 0
  );

  let strongestRole = roleBalance.strongestRole;
  let weakestRole = roleBalance.weakestRole;

  if (!strongestRole && roleEntries.length > 0) {
    strongestRole = roleEntries.reduce((best, r) =>
      roleStats[r].kd > roleStats[best].kd ? r : best
    );
  }
  if (!weakestRole && roleEntries.length > 1) {
    const candidate = roleEntries.reduce((worst, r) =>
      roleStats[r].kd < roleStats[worst].kd ? r : worst
    );
    if (candidate !== strongestRole) weakestRole = candidate;
  }

  if (strongestRole) {
    const stats = roleStats[strongestRole];
    insights.push({
      eyebrow: t("strongestRole"),
      headline: tBalance(`roles.${strongestRole}`),
      detail: t("roleDetail", {
        kd: formatter.number(stats.kd, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }),
        deaths: formatter.number(stats.deathsPer10Min, {
          maximumFractionDigits: 1,
          minimumFractionDigits: 1,
        }),
      }),
      tone: "positive",
    });
  }

  if (weakestRole && weakestRole !== strongestRole) {
    const stats = roleStats[weakestRole];
    insights.push({
      eyebrow: t("needsWork"),
      headline: tBalance(`roles.${weakestRole}`),
      detail: t("roleDetail", {
        kd: formatter.number(stats.kd, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }),
        deaths: formatter.number(stats.deathsPer10Min, {
          maximumFractionDigits: 1,
          minimumFractionDigits: 1,
        }),
      }),
      tone: "negative",
    });
  }

  if (bestMap) {
    insights.push({
      eyebrow: t("strongestMap"),
      headline: mapNames.get(toKebabCase(bestMap.mapName)) ?? bestMap.mapName,
      detail: t("mapWinrate", {
        winrate: formatter.number(bestMap.winrate / 100, {
          style: "percent",
          maximumFractionDigits: 0,
        }),
      }),
      tone: "positive",
    });
  }

  if (blindSpot) {
    insights.push({
      eyebrow: t("bleedSpot"),
      headline:
        mapNames.get(toKebabCase(blindSpot.mapName)) ?? blindSpot.mapName,
      detail: t("mapWinrate", {
        winrate: formatter.number(blindSpot.winrate / 100, {
          style: "percent",
          maximumFractionDigits: 0,
        }),
      }),
      tone: "negative",
    });
  }

  if (quickStats.bestDayOfWeek) {
    insights.push({
      eyebrow: t("bestDay"),
      headline: t(`days.${quickStats.bestDayOfWeek.day.toLowerCase()}`),
      detail: t("bestDayDetail", {
        winrate: formatter.number(quickStats.bestDayOfWeek.winrate / 100, {
          style: "percent",
          maximumFractionDigits: 0,
        }),
        count: quickStats.bestDayOfWeek.gamesPlayed,
      }),
      tone: quickStats.bestDayOfWeek.winrate >= 60 ? "positive" : "neutral",
    });
  }

  if (quickStats.firstPickSuccessRate) {
    const fp = quickStats.firstPickSuccessRate;
    insights.push({
      eyebrow: t("firstPickRate"),
      headline: formatter.number(fp.successRate / 100, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
      detail: t("firstPickDetail", {
        successful: fp.successfulFirstPicks,
        total: fp.totalFirstPicks,
      }),
      tone:
        fp.successRate >= 60
          ? "positive"
          : fp.successRate <= 40
            ? "negative"
            : "neutral",
    });
  }

  const balanceBadgeClass =
    roleBalance.balanceScore >= 0.6
      ? "bg-primary/15 text-primary"
      : "bg-muted text-muted-foreground";

  const balanceBadge = (
    <span
      className={cn(
        "rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
        balanceBadgeClass
      )}
    >
      {roleBalance.overall}
    </span>
  );

  const hasRadarData = ["Tank", "Damage", "Support"].some(
    (role) => roleStats[role as keyof RolePerformanceStats].totalPlaytime > 0
  );

  const radarData = hasRadarData
    ? [
        {
          metric: tBalance("eliminations"),
          Tank: normalizeKD(roleStats.Tank.kd),
          Damage: normalizeKD(roleStats.Damage.kd),
          Support: normalizeKD(roleStats.Support.kd),
        },
        {
          metric: tBalance("survivability"),
          Tank: normalizeSurvivability(roleStats.Tank.deathsPer10Min),
          Damage: normalizeSurvivability(roleStats.Damage.deathsPer10Min),
          Support: normalizeSurvivability(roleStats.Support.deathsPer10Min),
        },
        {
          metric: tBalance("ultUsage"),
          Tank: normalizeUltUsage(roleStats.Tank.ultEfficiency),
          Damage: normalizeUltUsage(roleStats.Damage.ultEfficiency),
          Support: normalizeUltUsage(roleStats.Support.ultEfficiency),
        },
        {
          metric: tBalance("activity"),
          Tank: normalizeActivity(roleStats.Tank.totalPlaytime),
          Damage: normalizeActivity(roleStats.Damage.totalPlaytime),
          Support: normalizeActivity(roleStats.Support.totalPlaytime),
        },
      ]
    : [];

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        rightSlot={balanceBadge}
      />
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noInsights")}</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {insights.map((ins) => (
                <div key={ins.eyebrow} className="space-y-1">
                  <dt
                    className={cn(
                      "font-mono text-[10px] tracking-[0.18em] uppercase",
                      ins.tone === "positive"
                        ? "text-primary"
                        : ins.tone === "negative"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {ins.eyebrow}
                  </dt>
                  <dd className="text-foreground text-base leading-tight font-medium">
                    {ins.headline}
                  </dd>
                  <dd className="text-muted-foreground font-mono text-xs tabular-nums">
                    {ins.detail}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="lg:col-span-5">
          {hasRadarData ? (
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} outerRadius="78%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{
                      fontSize: 10,
                      fill: "var(--muted-foreground)",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name={tBalance("tank")}
                    dataKey="Tank"
                    stroke="var(--chart-1)"
                    fill="var(--chart-1)"
                    fillOpacity={0.3}
                    strokeWidth={1.5}
                  />
                  <Radar
                    name={tBalance("damage")}
                    dataKey="Damage"
                    stroke="var(--chart-3)"
                    fill="var(--chart-3)"
                    fillOpacity={0.3}
                    strokeWidth={1.5}
                  />
                  <Radar
                    name={tBalance("support")}
                    dataKey="Support"
                    stroke="var(--chart-5)"
                    fill="var(--chart-5)"
                    fillOpacity={0.3}
                    strokeWidth={1.5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[10px] tracking-[0.16em] uppercase">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: "var(--chart-1)" }}
                  />
                  <span className="text-muted-foreground">
                    {tBalance("tank")}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: "var(--chart-3)" }}
                  />
                  <span className="text-muted-foreground">
                    {tBalance("damage")}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: "var(--chart-5)" }}
                  />
                  <span className="text-muted-foreground">
                    {tBalance("support")}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {tBalance("noData")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
