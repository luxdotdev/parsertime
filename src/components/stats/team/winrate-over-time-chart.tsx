"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WinrateDataPoint } from "@/data/team-performance-trends-dto";
import { useTranslations } from "next-intl";
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

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("teamStatsPage.winrateOverTimeChart");

  if (active && payload?.length) {
    const data = payload[0].payload as WinrateDataPoint;
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm">
          {t.rich("winrate", {
            span: (chunks) => <span className="font-bold">{chunks}</span>,
            winrate: data.winrate.toFixed(1),
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
  const [timeframe, setTimeframe] = useState<"week" | "month">("week");

  const data = timeframe === "week" ? weeklyData : monthlyData;

  const hasData = data.length > 0;

  if (!hasData) {
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

  const avgWinrate =
    data.length > 0
      ? data.reduce((sum, point) => sum + point.winrate, 0) / data.length
      : 0;

  const trend =
    data.length >= 2 ? data[data.length - 1].winrate - data[0].winrate : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {t.rich("average", {
                avgWinrate: avgWinrate.toFixed(1),
                trend: trend > 0 ? "↑" : trend < 0 ? "↓" : "→",
                trendValue: Math.abs(trend).toFixed(1),
                span: (chunks) => (
                  <span
                    className={
                      trend > 0
                        ? "text-green-600 dark:text-green-400"
                        : trend < 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                    }
                  >
                    {chunks}
                  </span>
                ),
              })}
            </p>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} />
            <YAxis
              domain={[0, 100]}
              label={{
                value: t("winrateLabel"),
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="winrate"
              stroke="#3b82f6"
              strokeWidth={2}
              name={t("winrateLabel")}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey={() => 50}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              strokeWidth={1}
              name={t("50PercentLine")}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
