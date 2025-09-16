"use client";

import { CardContent, CardFooter } from "@/components/ui/card";
import type { NonMappableStat, Stat } from "@/lib/player-charts";
import { cn, format, round, toMins } from "@/lib/utils";
import type { PlayerStat, Scrim } from "@prisma/client";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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

type Data = {
  name: string;
  pv: number;
  time: number;
}[];

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (active && payload?.length) {
    return (
      <div className="bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          <span className="text-blue-500">
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
            data={processedData}
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
            <Legend />
            <Line
              type="monotone"
              dataKey="pv"
              stroke="#3b82f6"
              activeDot={{ r: 8 }}
              name={t(`stats.${stat}` as never)}
            />
          </LineChart>
        </ResponsiveContainer>
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
