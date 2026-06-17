"use client";

import type { SwapTimingOutcome, SwapWinrateBucket } from "@/data/team/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { useFormatter, useTranslations } from "next-intl";

type ChartDatum = {
  label: string;
  winrate: number;
  fill: string;
  detail: string;
};

const FAVORABLE_COLOR = "#10b981";
const UNFAVORABLE_COLOR = "#f43f5e";

function fillForRate(rate: number) {
  return rate >= 50 ? FAVORABLE_COLOR : UNFAVORABLE_COLOR;
}

function formatPercent(
  value: number,
  formatter: ReturnType<typeof useFormatter>,
  digits = 0
) {
  return formatter.number(value / 100, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getBucketLabel(label: string, t: ReturnType<typeof useTranslations>) {
  switch (label) {
    case "0 swaps":
      return t("chart.buckets.zeroSwaps");
    case "1 swap":
      return t("chart.buckets.oneSwap");
    case "2 swaps":
      return t("chart.buckets.twoSwaps");
    case "3+ swaps":
      return t("chart.buckets.threePlusSwaps");
    case "Early (0-33%)":
      return t("chart.buckets.early");
    case "Mid (33-66%)":
      return t("chart.buckets.mid");
    case "Late (66-100%)":
      return t("chart.buckets.late");
    default:
      return label;
  }
}

function SwapTooltip({
  active,
  payload,
  label,
  intlFormatter,
  t,
}: TooltipProps<ValueType, NameType> & {
  intlFormatter: ReturnType<typeof useFormatter>;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as ChartDatum;
  return (
    <div className="bg-popover text-popover-foreground border-border z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums">
        {t("chart.tooltipWinRate", {
          winrate: formatPercent(datum.winrate, intlFormatter, 1),
        })}
      </p>
      <p className="text-primary-foreground/70">{datum.detail}</p>
    </div>
  );
}

export function SwapWinRateChart({
  swapCountBuckets,
  timingBuckets,
}: {
  swapCountBuckets: SwapWinrateBucket[];
  timingBuckets: SwapTimingOutcome[];
}) {
  const t = useTranslations("scrimPage.overviewSections.swaps");
  const formatter = useFormatter();
  const data: ChartDatum[] = [];

  for (const bucket of swapCountBuckets) {
    if (bucket.totalMaps === 0) continue;
    data.push({
      label: getBucketLabel(bucket.label, t),
      winrate: bucket.winrate,
      fill: fillForRate(bucket.winrate),
      detail: t("chart.detail", {
        wins: bucket.wins,
        losses: bucket.losses,
        maps: bucket.totalMaps,
      }),
    });
  }

  for (const bucket of timingBuckets) {
    if (bucket.totalMaps === 0) continue;
    data.push({
      label: getBucketLabel(bucket.label, t),
      winrate: bucket.winrate,
      fill: fillForRate(bucket.winrate),
      detail: t("chart.detail", {
        wins: bucket.wins,
        losses: bucket.losses,
        maps: bucket.totalMaps,
      }),
    });
  }

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
            fill: "var(--muted-foreground)",
          }}
          tickFormatter={(v: string) => v.toUpperCase()}
          interval={0}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => formatPercent(v, formatter)}
          allowDecimals={false}
          tick={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            fill: "var(--muted-foreground)",
          }}
        />
        <ReferenceLine
          y={50}
          stroke="var(--border)"
          strokeDasharray="4 4"
          label={{
            value: "50%",
            position: "insideTopLeft",
            fontSize: 10,
            fill: "var(--muted-foreground)",
          }}
        />
        <Tooltip content={<SwapTooltip intlFormatter={formatter} t={t} />} />
        <Bar dataKey="winrate" name={t("chart.winRate")} radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
