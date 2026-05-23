"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ScrimStatPoint } from "@/data/player/types";
import { getStatConfig } from "@/lib/target-stats";
import { round } from "@/lib/utils";
import type { PlayerTarget } from "@prisma/client";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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

type Props = {
  stat: string;
  scrimStats: ScrimStatPoint[];
  target?: PlayerTarget | null;
  progressPercent?: number;
  currentValue?: number;
  trending?: "toward" | "away" | "neutral";
};

function computeTrendLine(data: { date: string; value: number }[]) {
  const n = data.length;
  if (n < 2)
    return {
      data: data.map((d) => ({ ...d, trend: null as number | null })),
      slope: 0,
    };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].value;
    sumXY += i * data[i].value;
    sumX2 += i * i;
  }
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  return {
    data: data.map((d, i) => ({ ...d, trend: round(m * i + b) })),
    slope: m,
  };
}

function ChartTooltip({
  active,
  payload,
  label,
  localeFormatter,
}: TooltipProps<ValueType, NameType> & {
  localeFormatter: ReturnType<typeof useFormatter>;
}) {
  if (active && payload?.length) {
    return (
      <div className="bg-popover text-popover-foreground border-border z-50 rounded-md border px-3 py-1.5 text-xs shadow-md">
        <p className="text-sm font-bold">
          {localeFormatter.dateTime(new Date(label as string), {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
        <p className="text-sm">
          {localeFormatter.number(payload[0].value as number, {
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
    );
  }
  return null;
}

export function StatTrendChart({
  stat,
  scrimStats,
  target,
  progressPercent = 0,
  currentValue,
  trending = "neutral",
}: Props) {
  const t = useTranslations("targets");
  const formatter = useFormatter();
  const [focused, setFocused] = useState<string | null>(null);

  function getOpacity(key: string) {
    return focused === null || focused === key ? 1 : 0.15;
  }

  const config = getStatConfig(stat);
  if (!config) return null;
  const statLabel = t(`stats.${stat}`);

  const rawChartData = scrimStats.map((s) => ({
    date: new Date(s.scrimDate).toISOString(),
    value: round(s.stats[stat] ?? 0),
  }));
  const { data: chartData, slope } = computeTrendLine(rawChartData);

  // Green if the trend is improving, red if worsening
  const slopeIsPositive = slope > 0;
  const trendIsGood =
    config.better === "higher" ? slopeIsPositive : !slopeIsPositive;
  const trendLineColor =
    slope === 0
      ? "var(--color-muted-foreground)"
      : trendIsGood
        ? "var(--color-green-500)"
        : "var(--color-red-500)";

  const targetValue = target
    ? round(
        target.baselineValue *
          (target.targetDirection === "increase"
            ? 1 + target.targetPercent / 100
            : 1 - target.targetPercent / 100)
      )
    : null;

  const allValues = chartData.map((d) => d.value);
  if (target) {
    allValues.push(round(target.baselineValue));
    if (targetValue !== null) allValues.push(targetValue);
  }
  const yMin = round(Math.min(...allValues) * 0.9);
  const yMax = round(Math.max(...allValues) * 1.1);

  const trendColor =
    trending === "toward"
      ? "var(--color-green-500)"
      : trending === "away"
        ? "var(--color-red-500)"
        : "var(--color-blue-500)";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{statLabel}</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            {currentValue !== undefined && (
              <span
                className="font-mono"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatter.number(round(currentValue))}
              </span>
            )}
            {trending === "toward" ? (
              <TrendingUpIcon
                className={
                  config.better === "higher" ? "text-green-500" : "text-red-500"
                }
                size={16}
              />
            ) : trending === "away" ? (
              <TrendingDownIcon
                className={
                  config.better === "higher" ? "text-red-500" : "text-green-500"
                }
                size={16}
              />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(value: string) =>
                formatter.dateTime(new Date(value), {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatter.number(round(v))}
            />
            <Tooltip content={<ChartTooltip localeFormatter={formatter} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={trendColor}
              strokeWidth={2}
              strokeOpacity={getOpacity("value")}
              dot={{
                r: 3,
                fillOpacity: getOpacity("value"),
                strokeOpacity: getOpacity("value"),
              }}
              activeDot={{ r: 5 }}
              name={statLabel}
            />
            {chartData.length >= 2 && (
              <Line
                type="linear"
                dataKey="trend"
                stroke={trendLineColor}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                strokeOpacity={getOpacity("trend")}
                dot={false}
                activeDot={false}
                name={t("trend")}
                connectNulls
              />
            )}
            {target && (
              <ReferenceLine
                y={target.baselineValue}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 4"
                label={{
                  value: t("baselineValue", {
                    value: formatter.number(round(target.baselineValue)),
                  }),
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "var(--color-muted-foreground)",
                }}
              />
            )}
            {targetValue !== null && (
              <ReferenceLine
                y={targetValue}
                stroke={
                  trending === "toward"
                    ? "var(--color-green-500)"
                    : "var(--color-yellow-500)"
                }
                strokeDasharray="6 3"
                label={{
                  value: t("targetValue", {
                    value: formatter.number(round(targetValue)),
                  }),
                  position: "insideBottomRight",
                  fontSize: 10,
                  fill:
                    trending === "toward"
                      ? "var(--color-green-500)"
                      : "var(--color-yellow-500)",
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <div className="flex items-center gap-3">
            {[
              { key: "value", label: statLabel, color: trendColor },
              ...(chartData.length >= 2
                ? [{ key: "trend", label: t("trend"), color: trendLineColor }]
                : []),
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className="flex cursor-pointer items-center gap-1"
                onClick={() =>
                  setFocused((prev) => (prev === item.key ? null : item.key))
                }
              >
                <div
                  className="h-2 w-2 rounded-full transition-opacity"
                  style={{
                    backgroundColor: item.color,
                    opacity: getOpacity(item.key),
                  }}
                />
                <span
                  className="text-muted-foreground text-[10px] transition-opacity"
                  style={{ opacity: getOpacity(item.key) }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          <span className="text-muted-foreground/60 text-[9px]">
            {t("clickToIsolate")}
          </span>
        </div>
        {target && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("progress")}:{" "}
              <span
                className={
                  progressPercent >= 75
                    ? "text-green-500"
                    : progressPercent >= 25
                      ? "text-yellow-500"
                      : "text-red-500"
                }
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatter.number(round(progressPercent) / 100, {
                  style: "percent",
                  maximumFractionDigits: 0,
                })}
              </span>
            </span>
            <span className="text-muted-foreground">
              {t("baselineTargetSummary", {
                baseline: formatter.number(round(target.baselineValue)),
                target: formatter.number(round(targetValue!)),
              })}
            </span>
          </div>
        )}
      </CardContent>
      {chartData.length > 0 && (
        <CardFooter>
          <p
            className="text-muted-foreground text-sm"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {t.rich("chartSummary", {
              average: formatter.number(
                round(
                  chartData.reduce((s, d) => s + d.value, 0) / chartData.length
                )
              ),
              max: formatter.number(
                round(Math.max(...chartData.map((d) => d.value)))
              ),
              min: formatter.number(
                round(Math.min(...chartData.map((d) => d.value)))
              ),
              value: (chunks) => (
                <span className="text-foreground">{chunks}</span>
              ),
            })}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
