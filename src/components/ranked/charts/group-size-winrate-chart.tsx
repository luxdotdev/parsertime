"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  GROUP_SIZE_MIN_MATCHES,
  type GroupSizeEntry,
  type GroupSizeResult,
} from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

type GroupSizeWinrateChartProps = {
  result: GroupSizeResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

function winrateColor(winrate: number): string {
  if (winrate >= 60) return "var(--chart-win)";
  if (winrate >= 50) return "var(--primary)";
  return "var(--chart-loss)";
}

type DescriptionResult = {
  key: string;
  args: { winrate: number; label: string; games?: number; diff?: number };
};

function buildDescription(
  insight: GroupSizeResult["insight"],
  data: GroupSizeEntry[]
): DescriptionResult {
  const optimalGames = data.find((e) => e.groupSize === insight.optimalSize);
  const baseArgs = {
    winrate: insight.optimalWinrate,
    label: insight.optimalLabel,
  };

  if (
    insight.soloWinrate !== null &&
    insight.optimalSize !== 1 &&
    insight.optimalWinrate > insight.soloWinrate
  ) {
    const diff =
      Math.round((insight.optimalWinrate - insight.soloWinrate) * 10) / 10;
    return optimalGames
      ? {
          key: "descriptionWithCountAndDiff",
          args: { ...baseArgs, games: optimalGames.total, diff },
        }
      : { key: "descriptionWithDiff", args: { ...baseArgs, diff } };
  }

  return optimalGames
    ? {
        key: "descriptionWithCount",
        args: { ...baseArgs, games: optimalGames.total },
      }
    : { key: "description", args: baseArgs };
}

export function GroupSizeWinrateChart({ result }: GroupSizeWinrateChartProps) {
  const t = useTranslations("ranked.charts.groupSizeWinrate");
  const { data, insight } = result;

  const qualifiedData = data.filter((e) => e.total >= GROUP_SIZE_MIN_MATCHES);

  if (qualifiedData.length === 0 || !insight.hasEnoughData) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("descriptionEmpty")}
        />
        <div className="flex h-[280px] items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </div>
      </section>
    );
  }

  const descriptionResult = buildDescription(insight, data);
  const description = t(descriptionResult.key, descriptionResult.args);

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
          margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            fontSize={12}
          />
          <ReferenceLine
            y={50}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const payload = item.payload as GroupSizeEntry;
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
          <Bar dataKey="winrate" radius={[4, 4, 0, 0]}>
            {qualifiedData.map((entry) => (
              <Cell
                key={entry.groupSize}
                fill={winrateColor(entry.winrate)}
                opacity={entry.groupSize === insight.optimalSize ? 1 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-muted-foreground text-xs">
        {t("footer", {
          min: GROUP_SIZE_MIN_MATCHES,
          showing: qualifiedData.length,
        })}
      </p>
    </section>
  );
}
