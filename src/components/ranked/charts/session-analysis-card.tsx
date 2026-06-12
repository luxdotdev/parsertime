"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SessionAnalysisResult, SessionEntry } from "@/lib/ranked-stats";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

type SessionAnalysisCardProps = {
  result: SessionAnalysisResult;
};

const chartConfig = {
  winrate: {
    label: "Winrate",
  },
} satisfies ChartConfig;

function sessionBarColor(winrate: number): string {
  if (winrate >= 55) return "var(--chart-win)";
  if (winrate >= 45) return "oklch(0.72 0.15 50)";
  return "var(--chart-loss)";
}

export function SessionAnalysisCard({ result }: SessionAnalysisCardProps) {
  const t = useTranslations("ranked.charts.sessionAnalysis");
  const {
    sessions,
    avgSessionWinrate,
    avgGamesPerSession,
    bestSession,
    worstSession,
  } = result;

  const recentSessions = sessions.slice(-20);

  if (sessions.length < 2) {
    return (
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("emptyDescription")}
        />
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-muted-foreground text-sm">{t("emptyTitle")}</p>
          <p className="text-muted-foreground/70 text-xs text-pretty max-w-[220px]">
            {t("emptyHint")}
          </p>
        </div>
      </section>
    );
  }

  const insight =
    sessions.length === 1
      ? t("insightSingle", {
          winrate: avgSessionWinrate,
          games: avgGamesPerSession,
        })
      : t("insightMany", {
          sessions: sessions.length,
          winrate: avgSessionWinrate,
          games: avgGamesPerSession,
        });

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={insight}
      />
      <div className="space-y-4">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart
            data={recentSessions}
            margin={{ top: 4, right: 8, left: -8, bottom: 4 }}
          >
            <CartesianGrid vertical={false} strokeOpacity={0.3} />
            <XAxis
              dataKey="sessionIndex"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(v) => `S${v}`}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideIndicator
                  formatter={(_value, _name, item) => {
                    const s = item.payload as SessionEntry;
                    return (
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-muted-foreground">{s.date}</span>
                        <span className="font-mono tabular-nums font-medium">
                          {t("tooltipWinrate", { winrate: s.winrate })}
                        </span>
                        <span className="text-muted-foreground">
                          {t("tooltipRecord", {
                            wins: s.wins,
                            losses: s.losses,
                            games: s.gamesPlayed,
                          })}
                        </span>
                        {s.durationMinutes !== null && (
                          <span className="text-muted-foreground">
                            {t("tooltipDuration", {
                              minutes: s.durationMinutes,
                            })}
                          </span>
                        )}
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="winrate" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {recentSessions.map((s) => (
                <Cell
                  key={s.sessionIndex}
                  fill={sessionBarColor(s.winrate)}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {avgSessionWinrate}%
            </p>
            <p className="text-muted-foreground text-xs">{t("avgWinrate")}</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {avgGamesPerSession}
            </p>
            <p className="text-muted-foreground text-xs">{t("gamesPerSession")}</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {sessions.length}
            </p>
            <p className="text-muted-foreground text-xs">{t("totalSessions")}</p>
          </div>
        </div>

        {bestSession && worstSession && bestSession !== worstSession && (
          <div className="grid grid-cols-2 gap-2">
            <div className="border-border rounded-md border bg-primary/15 p-2 text-center">
              <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                {bestSession.winrate}%
              </p>
              <p className="text-primary text-xs">{t("bestSession")}</p>
              <p className="text-muted-foreground text-xs">
                {bestSession.date}
              </p>
            </div>
            <div className="border-border rounded-md border bg-destructive/15 p-2 text-center">
              <p className="font-mono text-sm font-semibold tabular-nums text-destructive">
                {worstSession.winrate}%
              </p>
              <p className="text-destructive text-xs">{t("worstSession")}</p>
              <p className="text-muted-foreground text-xs">
                {worstSession.date}
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {t("footer", { count: recentSessions.length })}
      </p>
    </section>
  );
}
