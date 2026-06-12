"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  ROLE_WINRATE_MIN_MATCHES,
  type RoleStatsResult,
  type RoleWinrateEntry,
} from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type RoleWinrateChartProps = {
  result: RoleStatsResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

export function RoleWinrateChart({ result }: RoleWinrateChartProps) {
  const t = useTranslations("ranked.charts.roleWinrate");
  const { winrates, insight } = result;

  const qualifiedData = winrates.filter(
    (r) => r.total >= ROLE_WINRATE_MIN_MATCHES
  );

  const description = !insight.hasEnoughData
    ? t("descriptionEmpty", { min: ROLE_WINRATE_MIN_MATCHES })
    : t("description", {
        role: insight.bestRole,
        winrate: insight.bestWinrate,
      });

  if (qualifiedData.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={description}
        />
        <div className="flex h-[280px] items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
      />
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            data={qualifiedData}
            layout="vertical"
            margin={{ top: 8, right: 48, left: 4, bottom: 4 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="role"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={60}
            />
            <ReferenceLine
              x={50}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const payload = item.payload as RoleWinrateEntry;
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {t("winrate")}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {value}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {t("winLossGames", {
                            wins: payload.wins,
                            losses: payload.losses,
                            total: payload.total,
                          })}
                        </div>
                      </div>
                    );
                  }}
                  hideIndicator
                />
              }
            />
            <Bar dataKey="winrate" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="winrate"
                position="right"
                formatter={(v: number) => `${v}%`}
                className="fill-muted-foreground text-xs tabular-nums"
                fontSize={12}
              />
              {qualifiedData.map((entry) => (
                <Cell
                  key={entry.role}
                  fill={entry.fill}
                  opacity={
                    entry.role === insight.bestRole ? 1 : 0.65
                  }
                />
              ))}
            </Bar>
          </BarChart>
      </ChartContainer>
      <p className="text-muted-foreground text-xs">
        {t("footer", {
          min: ROLE_WINRATE_MIN_MATCHES,
          showing: qualifiedData.length,
        })}
      </p>
    </section>
  );
}
