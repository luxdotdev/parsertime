"use client";

import { CardContent, CardFooter } from "@/components/ui/card";
import { cn, toTimestampWithHours } from "@/lib/utils";
import { HeroName, heroRoleMapping } from "@/types/heroes";
import { PlayerStat } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type Data = {
  name: string;
  pv: number;
}[];

const COLORS = ["#3b82f6", "#ef4444", "#22c55e"] as const;

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("statsPage.playerStats.timeSpent");

  if (active && payload && payload.length) {
    return (
      <div className="z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
        <h3 className="text-base font-bold">
          {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            payload[0].name
          }
        </h3>
        <p className="text-sm">
          <span
            className={cn(
              payload[0].name === t("tank")
                ? "text-blue-500"
                : payload[0].name === t("damage")
                  ? "text-red-500"
                  : "text-green-500"
            )}
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
  const renderCustomizedLabel = ({
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
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <>
      <CardContent>
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
              fill="#82ca9d"
              label={renderCustomizedLabel}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell
                  // eslint-disable-next-line react/no-array-index-key
                  key={`cell-${index}`}
                  fill={
                    entry.name === t("tank")
                      ? COLORS[0]
                      : entry.name === t("damage")
                        ? COLORS[1]
                        : COLORS[2]
                  }
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          {t.rich("footer", {
            span: (chunks) => <span className="text-foreground">{chunks}</span>,
            toTimestampWithHours: toTimestampWithHours(totalTimePlayed),
            timePerRole: pieData
              .map((entry) => `${entry.name}: ${entry.pv.toFixed(2)}%`)
              .join(", "),
          })}
        </p>
      </CardFooter>
    </>
  );
}
