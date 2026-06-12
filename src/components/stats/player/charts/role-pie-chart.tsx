"use client";

import { toTimestampWithHours } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PlayerStat } from "@/generated/prisma/browser";
import { useTranslations } from "next-intl";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type Data = {
  name: string;
  pv: number;
}[];

const TANK_COLOR = "var(--chart-1)";
const DAMAGE_COLOR = "var(--chart-3)";
const SUPPORT_COLOR = "var(--chart-5)";

function colorForRole(
  name: string,
  t: ReturnType<typeof useTranslations>
): string {
  if (name === t("tank")) return TANK_COLOR;
  if (name === t("damage")) return DAMAGE_COLOR;
  return SUPPORT_COLOR;
}

function CustomTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("statsPage.playerStats.timeSpent");

  if (active && payload?.length) {
    const name = payload[0].name as string;
    return (
      <div className="bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md">
        <h3 className="text-base font-bold">{name}</h3>
        <p className="text-sm">
          <span
            className="font-mono tabular-nums"
            style={{ color: colorForRole(name, t) }}
          >
            {(payload[0].value as number).toFixed(2)}%
          </span>
        </p>
      </div>
    );
  }

  return null;
}

type Props = { data: PlayerStat[] };

export function RolePieChart({ data }: Props) {
  const t = useTranslations("statsPage.playerStats.timeSpent");

  const processedData: Data = data.map((row) => ({
    name: t(heroRoleMapping[row.player_hero as HeroName].toLowerCase()),
    pv: row.hero_time_played,
  }));

  const totalTimePlayed = processedData.reduce((acc, curr) => acc + curr.pv, 0);

  // group by role
  const groupedData = processedData.reduce(
    (acc, curr) => {
      if (acc[curr.name]) {
        acc[curr.name] += curr.pv;
      } else {
        acc[curr.name] = curr.pv;
      }

      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(groupedData)
    .map(([name, pv]) => ({
      name,
      pv: (pv / totalTimePlayed) * 100,
    }))
    .filter((entry) => entry.pv > 0);

  const RADIAN = Math.PI / 180;

  function renderCustomizedLabel({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="var(--primary-foreground)"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-mono text-[11px] tabular-nums"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart
          width={500}
          height={250}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <Pie
            data={pieData}
            type="monotone"
            dataKey="pv"
            label={renderCustomizedLabel}
            labelLine={false}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={colorForRole(entry.name, t)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-muted-foreground line-clamp-2 text-sm">
        {t.rich("footer", {
          span: (chunks) => (
            <span className="text-foreground font-mono tabular-nums">
              {chunks}
            </span>
          ),
          toTimestampWithHours: toTimestampWithHours(totalTimePlayed),
          timePerRole: pieData
            .map((entry) => `${entry.name}: ${entry.pv.toFixed(2)}%`)
            .join(", "),
        })}
      </p>
    </div>
  );
}
