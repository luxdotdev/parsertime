"use client";

import { format } from "@/lib/utils";
import type { Kill } from "@/generated/prisma/browser";
import { useTranslations } from "next-intl";
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
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

type Data = {
  method: string;
  pv: number;
  max: number;
}[];

type Props = {
  data: Kill[];
};

const PIE_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const RADAR_COLOR = "var(--chart-1)";

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("statsPage.playerStats.finalBlowsByMethod");

  if (active && payload?.length) {
    return (
      <div className="bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          <span
            className="font-mono tabular-nums"
            style={{ color: RADAR_COLOR }}
          >
            {format(payload[0].value as number)}
          </span>{" "}
          {t("finalBlows")}
        </p>
      </div>
    );
  }

  return null;
}

export function KillMethodChart({ data }: Props) {
  const t = useTranslations("statsPage.playerStats.finalBlowsByMethod");

  function formatMethod(method: string) {
    if (method === "0") return t("primary");
    if (method === "Primary Fire") return t("primary");
    if (method === "Secondary Fire") return t("secondary");
    return method;
  }

  const killData = data.map((kill) => ({
    method: formatMethod(kill.event_ability),
    pv: 1,
  }));

  // sum the kill data
  const killDataMap = new Map<string, number>();
  killData.forEach((kill) => {
    killDataMap.set(kill.method, (killDataMap.get(kill.method) ?? 0) + 1);
  });

  const processedData: Data = Array.from(killDataMap.entries()).map(
    ([method, pv]) => ({
      method,
      pv,
      max: data.length,
    })
  );

  const useFallbackPie = processedData.length <= 2;

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={300}>
        {useFallbackPie ? (
          <PieChart margin={{ top: 10, right: 40, left: 30, bottom: 10 }}>
            <Pie
              data={processedData}
              dataKey="pv"
              nameKey="method"
              outerRadius={100}
              stroke="var(--card)"
              strokeWidth={2}
              label={({ method, pv }) =>
                `${method} (${Math.round((pv / data.length) * 100)}%)`
              }
              labelLine={false}
              isAnimationActive={false}
            >
              {processedData.map((entry, idx) => (
                <Cell
                  key={entry.method}
                  fill={PIE_PALETTE[idx % PIE_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        ) : (
          <RadarChart
            width={500}
            height={250}
            margin={{
              top: 10,
              right: 40,
              left: 30,
              bottom: 10,
            }}
            data={processedData}
          >
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="method"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Radar
              type="monotone"
              dataKey="pv"
              stroke={RADAR_COLOR}
              fill={RADAR_COLOR}
              fillOpacity={0.6}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        )}
      </ResponsiveContainer>
      <p className="text-muted-foreground text-sm">
        {t.rich("footer", {
          span: (chunks) => (
            <span className="text-foreground font-mono tabular-nums">
              {chunks}
            </span>
          ),
          format: format(data.length),
        })}
      </p>
    </div>
  );
}
