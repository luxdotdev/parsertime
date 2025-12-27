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
import { round } from "@/lib/utils";
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
  if (active && payload?.length) {
    const data = payload[0].payload as WinrateDataPoint;
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm">
          Winrate: <span className="font-bold">{round(data.winrate)}%</span>
        </p>
        <p className="text-muted-foreground text-xs">
          {data.wins}W - {data.losses}L
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
  const [timeframe, setTimeframe] = useState<"week" | "month">("week");

  const data = timeframe === "week" ? weeklyData : monthlyData;

  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Winrate Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Not enough data to show winrate trends yet.
          </p>
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
            <CardTitle>Winrate Over Time</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Average: {avgWinrate.toFixed(1)}% •{" "}
              <span
                className={
                  trend > 0
                    ? "text-green-600 dark:text-green-400"
                    : trend < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }
              >
                {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"}{" "}
                {Math.abs(trend).toFixed(1)}%
              </span>
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
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
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
                value: "Winrate (%)",
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
              name="Winrate"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey={() => 50}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              strokeWidth={1}
              name="50% Line"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
