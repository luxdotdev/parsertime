"use client";

import { CardContent, CardFooter } from "@/components/ui/card";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import type { NonMappableStat, Stat } from "@/lib/player-charts";
import { cn, format, round, toMins } from "@/lib/utils";
import type { PlayerStat, Scrim } from "@prisma/client";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  CartesianGrid,
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

type Data = {
  name: string;
  pv: number;
  time: number;
}[];

type ChartPoint = {
  name: string;
  pv: number;
  trend: number | null;
};

/**
 * Computes a linear regression trend line over the data points.
 * Returns the augmented array and the slope for coloring.
 */
function computeTrendLine(data: { name: string; pv: number }[]): {
  data: ChartPoint[];
  slope: number;
} {
  const n = data.length;
  if (n < 2)
    return { data: data.map((d) => ({ ...d, trend: null })), slope: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].pv;
    sumXY += i * data[i].pv;
    sumX2 += i * i;
  }
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  return {
    data: data.map((d, i) => ({ ...d, trend: m * i + b })),
    slope: m,
  };
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  const { team1 } = useColorblindMode();

  if (active && payload?.length) {
    return (
      <div className="bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          <span style={{ color: team1 }}>
            {(payload[0].value as number).toFixed(2)}
          </span>
        </p>
      </div>
    );
  }

  return null;
}

function calculatePercentageChange(data: Data): string {
  if (data.length < 2) {
    return "0%";
  }

  const initialValue = data[0].pv;
  const finalValue = data[data.length - 1].pv;

  const percentageChange = ((finalValue - initialValue) / initialValue) * 100;

  return `${percentageChange >= 0 ? "+" : ""}${percentageChange.toFixed(2)}%`;
}

type Props<T> = {
  stat: T;
  data: PlayerStat[];
  scrimData: Scrim[];
  better: "higher" | "lower";
};

export function StatPer10Chart<T extends keyof Omit<Stat, NonMappableStat>>({
  stat,
  data,
  scrimData,
  better,
}: Props<T>) {
  const t = useTranslations("statsPage.playerStats");
  const { team1 } = useColorblindMode();
  const [focused, setFocused] = useState<string | null>(null);

  function getOpacity(key: string) {
    return focused === null || focused === key ? 1 : 0.15;
  }

  // We want to merge the stat values when the date is the same
  // Then we want to get the value per 10 minutes
  const chartData = data.map((playerStat) => ({
    name: scrimData
      .find((scrim) => scrim.id === playerStat.scrimId)
      ?.date.toDateString(),
    pv: playerStat[stat],
    time: playerStat.hero_time_played,
  })) as Data;

  // Add the stat and time played when the date is the same
  const processedData = chartData
    .reduce((acc, curr) => {
      const existing = acc.find((item) => item.name === curr.name);

      if (existing) {
        existing.pv += curr.pv;
        existing.time += curr.time;
      } else {
        acc.push({
          name: curr.name,
          pv: curr.pv,
          time: curr.time,
        });
      }

      return acc;
    }, [] as Data)
    .map((item) => ({
      ...item,
      pv: (item.pv / toMins(item.time)) * 10,
    }))
    .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
    .filter((item) => !isNaN(item.pv))
    .filter((item) => isFinite(item.pv));

  const { data: chartDataWithTrend, slope } = computeTrendLine(processedData);

  const slopeIsPositive = slope > 0;
  const trendIsGood = better === "higher" ? slopeIsPositive : !slopeIsPositive;
  const trendLineColor =
    slope === 0
      ? "var(--color-muted-foreground)"
      : trendIsGood
        ? "var(--color-green-500)"
        : "var(--color-red-500)";

  const avg =
    processedData.reduce((acc, curr) => acc + curr.pv, 0) /
    processedData.length;

  const max = Math.max(...processedData.map((item) => item.pv));
  const min = Math.min(...processedData.map((item) => item.pv));

  const percentageChange = calculatePercentageChange(processedData);

  return (
    <>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            width={500}
            height={250}
            data={chartDataWithTrend}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="pv"
              stroke={team1}
              strokeOpacity={getOpacity("pv")}
              activeDot={{ r: 8 }}
              dot={{
                fillOpacity: getOpacity("pv"),
                strokeOpacity: getOpacity("pv"),
              }}
              name={t(`stats.${stat}` as never)}
            />
            {chartDataWithTrend.length >= 2 && (
              <Line
                type="linear"
                dataKey="trend"
                stroke={trendLineColor}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                strokeOpacity={getOpacity("trend")}
                dot={false}
                activeDot={false}
                name={t("statPer10.trend")}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <div className="flex items-center gap-3">
            {[
              { key: "pv", label: t(`stats.${stat}` as never), color: team1 },
              ...(chartDataWithTrend.length >= 2
                ? [
                    {
                      key: "trend",
                      label: t("statPer10.trend"),
                      color: trendLineColor,
                    },
                  ]
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
                  {typeof item.label === "string" ? item.label : ""}
                </span>
              </button>
            ))}
          </div>
          <span className="text-muted-foreground/60 text-[9px]">
            Click to isolate
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <div className="space-y-1">
          <div className="text-foreground inline-flex items-center gap-1">
            <p>
              {t.rich("statPer10.footer", {
                span: (chunks) => (
                  <span
                    className={cn(
                      better === "higher" && percentageChange.includes("+")
                        ? "text-green-500"
                        : better === "higher" && percentageChange.includes("-")
                          ? "text-red-500"
                          : better === "lower" && percentageChange.includes("+")
                            ? "text-red-500"
                            : "text-green-500",
                      "inline-flex items-center gap-1"
                    )}
                  >
                    {chunks}
                  </span>
                ),
                percentageChange,
                scrimData: scrimData.length,
              })}{" "}
              <span className="inline-flex">
                {better === "higher" && percentageChange.includes("+") ? (
                  <TrendingUpIcon size={16} className="translate-y-[3px]" />
                ) : (
                  <TrendingDownIcon size={16} className="translate-y-[3px]" />
                )}
              </span>
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            {t("statPer10.avg")}{" "}
            <span className="text-foreground">{format(round(avg))}</span>{" "}
            {t("statPer10.max")}{" "}
            <span className="text-foreground">{format(round(max))}</span>{" "}
            {t("statPer10.min")}{" "}
            <span className="text-foreground">{format(round(min))}</span>
          </p>
        </div>
      </CardFooter>
    </>
  );
}
