"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TeamPositionalStats } from "@/data/team/positional-stats-service";
import {
  POSITIONAL_STAT_FORMATTERS,
  POSITIONAL_STAT_KEYS,
  type PositionalStatKey,
} from "@/lib/positional-stat-display";
import { ChartBar } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type TrendPoint = TeamPositionalStats["trends"][string][number];

export function PositionalStatsEmpty() {
  const t = useTranslations("teamStatsPage.positional");

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartBar />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("empty")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function formatTrendDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type TrendTooltipProps = TooltipProps<ValueType, NameType> & {
  stat: PositionalStatKey;
};

function TrendTooltip({ active, payload, stat }: TrendTooltipProps) {
  if (active && payload?.length) {
    const point = payload[0].payload as TrendPoint;
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold">{formatTrendDate(point.date)}</p>
        <p className="text-sm tabular-nums">
          {POSITIONAL_STAT_FORMATTERS[stat](point.value)}
        </p>
      </div>
    );
  }
  return null;
}

function TrendSparkline({
  stat,
  series,
  label,
}: {
  stat: PositionalStatKey;
  series: TrendPoint[];
  label: string;
}) {
  return (
    <div className="bg-card border-border flex flex-col gap-2 rounded-md border p-4">
      <p className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {label}
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart
          data={series}
          margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatTrendDate}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            minTickGap={16}
          />
          <YAxis
            width={36}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickFormatter={(value) =>
              POSITIONAL_STAT_FORMATTERS[stat](Number(value))
            }
          />
          <RechartsTooltip content={<TrendTooltip stat={stat} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 2, fill: "var(--primary)" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PositionalStatsCards({ data }: { data: TeamPositionalStats }) {
  const t = useTranslations("teamStatsPage.positional");

  const trendStats = POSITIONAL_STAT_KEYS.filter(
    (stat) => (data.trends[stat]?.length ?? 0) > 0
  );

  return (
    <div className="space-y-12">
      {/* Team-averages ribbon */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description", { count: data.scrimWindow })}
        />
        <dl className="bg-border grid w-full grid-cols-2 gap-px overflow-hidden rounded-md sm:grid-cols-4">
          {POSITIONAL_STAT_KEYS.map((stat) => {
            const value = data.teamAverages[stat];
            return (
              <div key={stat} className="bg-card flex flex-col px-4 py-3">
                <dt className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                  {t(`stats.${stat}.short`)}
                </dt>
                <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">
                  {value === undefined
                    ? "—"
                    : POSITIONAL_STAT_FORMATTERS[stat](value)}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* Per-stat trend sparklines */}
      {trendStats.length > 0 && (
        <section className="space-y-4">
          <SectionHeader eyebrow={t("eyebrow")} title={t("trendsTitle")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trendStats.map((stat) => (
              <TrendSparkline
                key={stat}
                stat={stat}
                series={data.trends[stat]}
                label={t(`stats.${stat}.short`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Per-player table */}
      <section className="space-y-4">
        <SectionHeader eyebrow={t("eyebrow")} title={t("playersTitle")} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0">
                  {t("playerColumn")}
                </TableHead>
                {POSITIONAL_STAT_KEYS.map((stat) => (
                  <TableHead key={stat} className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          {t(`stats.${stat}.short`)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t(`stats.${stat}.full`)}</TooltipContent>
                    </Tooltip>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.players.map((player) => (
                <TableRow key={player.playerName}>
                  <TableCell className="bg-background sticky left-0 font-medium">
                    {player.playerName}
                  </TableCell>
                  {POSITIONAL_STAT_KEYS.map((stat) => {
                    const value = player.stats[stat];
                    return (
                      <TableCell key={stat} className="text-right tabular-nums">
                        {value === undefined
                          ? "—"
                          : POSITIONAL_STAT_FORMATTERS[stat](value)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
