"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SessionAnalysisResult, SessionEntry } from "@/lib/ranked-stats";
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
  const {
    sessions,
    avgSessionWinrate,
    avgGamesPerSession,
    bestSession,
    worstSession,
    insight,
  } = result;

  const recentSessions = sessions.slice(-20);

  if (sessions.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Performance</CardTitle>
          <CardDescription>
            How do you perform within a single session?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Not enough sessions yet
            </p>
            <p className="text-muted-foreground/70 text-xs text-pretty max-w-[220px]">
              Sessions are groups of games played within 3 hours of each
              other. Play more matches to see trends.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Performance</CardTitle>
        <CardDescription>{insight}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
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
                          {s.winrate}% winrate
                        </span>
                        <span className="text-muted-foreground">
                          {s.wins}W – {s.losses}L &middot; {s.gamesPlayed}{" "}
                          game{s.gamesPlayed !== 1 ? "s" : ""}
                        </span>
                        {s.durationMinutes !== null && (
                          <span className="text-muted-foreground">
                            ~{s.durationMinutes} min session
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
            <p className="text-muted-foreground text-xs">Avg winrate</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {avgGamesPerSession}
            </p>
            <p className="text-muted-foreground text-xs">Games / session</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {sessions.length}
            </p>
            <p className="text-muted-foreground text-xs">Total sessions</p>
          </div>
        </div>

        {bestSession && worstSession && bestSession !== worstSession && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-emerald-500/10 p-2 text-center">
              <p className="font-mono text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {bestSession.winrate}%
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Best session
              </p>
              <p className="text-muted-foreground text-xs">
                {bestSession.date}
              </p>
            </div>
            <div className="rounded-md bg-red-500/10 p-2 text-center">
              <p className="font-mono text-sm font-semibold tabular-nums text-red-700 dark:text-red-400">
                {worstSession.winrate}%
              </p>
              <p className="text-xs text-red-700/80 dark:text-red-400/80">
                Worst session
              </p>
              <p className="text-muted-foreground text-xs">
                {worstSession.date}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Sessions are groups of games played within 3 hours of each other.
          Showing the last {recentSessions.length} session
          {recentSessions.length !== 1 ? "s" : ""}.
        </p>
      </CardFooter>
    </Card>
  );
}
