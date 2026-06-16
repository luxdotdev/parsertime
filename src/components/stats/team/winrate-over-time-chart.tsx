"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WinrateDataPoint } from "@/data/team/types";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type WinrateOverTimeChartProps = {
  weeklyData: WinrateDataPoint[];
  monthlyData: WinrateDataPoint[];
};

type CustomTooltipProps = TooltipProps<ValueType, NameType> & {
  formatPercent: (value: number) => string;
};

function CustomTooltip({
  active,
  payload,
  label,
  formatPercent,
}: CustomTooltipProps) {
  const t = useTranslations("teamStatsPage.winrateOverTimeChart");

  if (active && payload?.length) {
    const data = payload[0].payload as WinrateDataPoint;
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm">
          {t.rich("winrate", {
            span: (chunks) => <span className="font-bold">{chunks}</span>,
            winrate: formatPercent(data.winrate),
          })}
        </p>
        <p className="text-muted-foreground text-xs">
          {t("winsAndLosses", {
            wins: data.wins,
            losses: data.losses,
          })}
        </p>
      </div>
    );
  }
  return null;
}

export function WinrateOverTimeChart({
  weeklyData,
  monthlyData,
}: WinrateOverTimeChartProps) {
  const t = useTranslations("teamStatsPage.winrateOverTimeChart");
  const format = useFormatter();
  const [timeframe, setTimeframe] = useState<"week" | "month">("week");

  const data = timeframe === "week" ? weeklyData : monthlyData;
  const hasData = data.length > 0;

  function formatPercent(value: number): string {
    return format.number(value / 100, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  function formatWholePercent(value: number): string {
    return format.number(value / 100, {
      style: "percent",
      maximumFractionDigits: 0,
    });
  }

  function formatTrendValue(value: number): string {
    return format.number(Math.abs(value), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  const timeframeSelect = (
    <Select
      value={timeframe}
      onValueChange={(v) => setTimeframe(v as "week" | "month")}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="week">{t("weekly")}</SelectItem>
        <SelectItem value="month">{t("monthly")}</SelectItem>
      </SelectContent>
    </Select>
  );

  if (!hasData) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          rightSlot={timeframeSelect}
        />
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </section>
    );
  }

  const avgWinrate =
    data.length > 0
      ? data.reduce((sum, point) => sum + point.winrate, 0) / data.length
      : 0;

  const trend =
    data.length >= 2 ? data[data.length - 1].winrate - data[0].winrate : 0;

  const description = (
    <>
      {t.rich("average", {
        avgWinrate: formatPercent(avgWinrate),
        trend: trend > 0 ? "↑" : trend < 0 ? "↓" : "→",
        trendValue: formatTrendValue(trend),
        span: (chunks) => (
          <span
            className={
              trend > 0 ? "text-primary" : trend < 0 ? "text-destructive" : ""
            }
          >
            {chunks}
          </span>
        ),
      })}
    </>
  );

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        rightSlot={timeframeSelect}
      />
      <p className="text-muted-foreground text-sm">{description}</p>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="period"
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="var(--muted-foreground)"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value) => formatWholePercent(Number(value))}
            label={{
              value: t("winrateLabel"),
              angle: -90,
              position: "insideLeft",
              style: { fill: "var(--muted-foreground)" },
            }}
          />
          <Tooltip content={<CustomTooltip formatPercent={formatPercent} />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="winrate"
            stroke="var(--primary)"
            strokeWidth={2}
            name={t("winrateLabel")}
            dot={{ r: 4, fill: "var(--primary)" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey={() => 50}
            stroke="var(--muted-foreground)"
            strokeDasharray="5 5"
            strokeWidth={1}
            name={t("50PercentLine")}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
