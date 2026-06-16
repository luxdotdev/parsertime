"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ExternalLinkIcon,
  FileTextIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const eyebrow =
  "text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase";

const cardClass = "w-[28rem] max-w-full";

/** Amber for strong, neutral for middling, red for weak — matches the app. */
function winrateTone(winrate: number): "good" | "mid" | "bad" {
  if (winrate >= 60) return "good";
  if (winrate <= 40) return "bad";
  return "mid";
}

const barFill: Record<ReturnType<typeof winrateTone>, string> = {
  good: "var(--primary)",
  mid: "var(--muted-foreground)",
  bad: "var(--destructive)",
};

export function ToolLoading({ toolName }: { toolName: string }) {
  const t = useTranslations("analyst.cards");
  const isReport = toolName.toLowerCase().includes("report");

  return (
    <Card size="sm" className={cardClass}>
      <CardHeader>
        <span className={cn("flex items-center gap-1.5", eyebrow)}>
          {isReport && (
            <FileTextIcon className="size-3 animate-pulse" aria-hidden="true" />
          )}
          {isReport ? t("loading.writingReport") : toolName}
        </span>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {isReport && (
          <>
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </>
        )}
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

export function TeamOverviewCard({
  teams,
}: {
  teams: {
    id: number;
    name: string;
    totalScrims: number;
    players: string[];
  }[];
}) {
  const t = useTranslations("analyst.cards");
  return (
    <div className="flex flex-wrap gap-3">
      {teams.map((team) => (
        <Card key={team.id} size="sm" className="w-full max-w-xs">
          <CardHeader>
            <CardTitle className="text-sm">{team.name}</CardTitle>
            <span className={cn("tabular-nums", eyebrow)}>
              {t("teamOverview.scrims", { count: team.totalScrims })}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <UsersIcon className="size-3 shrink-0" aria-hidden="true" />
              <span>{team.players.join(", ")}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ScrimListCard({
  scrims,
}: {
  scrims: {
    id: number;
    name: string;
    date: string;
    mapCount: number;
    maps: { id: number; name: string }[];
  }[];
}) {
  const t = useTranslations("analyst.cards");
  return (
    <Card size="sm" className={cardClass}>
      <CardHeader>
        <span className={eyebrow}>{t("scrimList.eyebrow")}</span>
        <CardTitle className="text-sm tabular-nums">
          {t("scrimList.found", { count: scrims.length })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-border divide-y">
          {scrims.slice(0, 8).map((scrim) => (
            <div
              key={scrim.id}
              className="flex items-center justify-between gap-3 px-4 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{scrim.name}</p>
                <p className="text-muted-foreground font-mono tabular-nums">
                  {scrim.date}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
                {t("scrimList.maps", { count: scrim.mapCount })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScrimAnalysisCard({
  mapCount,
  wins,
  losses,
  draws,
  ourTeamName,
  opponentTeamName,
  insights,
  fightAnalysis,
  teamPlayers,
}: {
  mapCount: number;
  wins: number;
  losses: number;
  draws: number;
  ourTeamName: string;
  opponentTeamName: string;
  insights: { type: string; headline: string }[];
  fightAnalysis: {
    totalFights: number;
    fightsWon: number;
    fightWinrate: number;
  };
  teamPlayers: {
    playerName: string;
    primaryHero: string;
    kdRatio: number;
    eliminationsPer10: number;
    trend: string;
  }[];
}) {
  const t = useTranslations("analyst.cards");
  return (
    <Card size="sm" className={cardClass}>
      <CardHeader>
        <span className={eyebrow}>{t("scrimAnalysis.eyebrow")}</span>
        <CardTitle className="text-sm">
          {ourTeamName}{" "}
          <span className="text-muted-foreground">{t("scrimAnalysis.vs")}</span>{" "}
          {opponentTeamName}
        </CardTitle>
        <p className="font-mono text-xs tabular-nums">
          <span className="text-primary">
            {t("record.wins", { count: wins })}
          </span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-destructive">
            {t("record.losses", { count: losses })}
          </span>
          {draws > 0 && (
            <>
              <span className="text-muted-foreground"> · </span>
              <span className="text-muted-foreground">
                {t("record.draws", { count: draws })}
              </span>
            </>
          )}
          <span className="text-muted-foreground">
            {" "}
            · {t("scrimAnalysis.acrossMaps", { count: mapCount })}
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label={t("scrimAnalysis.fightWr")}
            value={`${fightAnalysis.fightWinrate}%`}
            emphasis
          />
          <StatTile
            label={t("scrimAnalysis.fightsWon")}
            value={`${fightAnalysis.fightsWon}`}
          />
          <StatTile
            label={t("scrimAnalysis.totalFights")}
            value={`${fightAnalysis.totalFights}`}
          />
        </div>

        {teamPlayers.length > 0 && (
          <div className="space-y-1.5">
            <p className={eyebrow}>{t("scrimAnalysis.players")}</p>
            <div className="divide-border divide-y">
              {teamPlayers.slice(0, 5).map((p) => (
                <div
                  key={p.playerName}
                  className="flex items-center justify-between gap-2 py-1.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{p.playerName}</span>
                    <span className="text-muted-foreground truncate">
                      {p.primaryHero}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex shrink-0 items-center gap-3 font-mono tabular-nums">
                    <span>{p.kdRatio} K/D</span>
                    <span>{p.eliminationsPer10} E/10</span>
                    <TrendBadge trend={p.trend} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <div className="space-y-1.5">
            <p className={eyebrow}>{t("scrimAnalysis.insights")}</p>
            <ul className="space-y-1">
              {insights.slice(0, 3).map((insight) => (
                <li
                  key={insight.headline}
                  className="text-foreground/90 flex gap-2 text-xs"
                >
                  <span
                    className="bg-primary mt-1.5 size-1 shrink-0 rounded-full"
                    aria-hidden="true"
                  />
                  <span>{insight.headline}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MapPerformanceCard({
  overallWins,
  overallLosses,
  overallWinrate,
  byMap,
}: {
  overallWins: number;
  overallLosses: number;
  overallWinrate: number;
  byMap: Record<
    string,
    { mapName: string; wins: number; losses: number; winrate: number }
  >;
}) {
  const t = useTranslations("analyst.cards");
  const maps = Object.values(byMap).sort((a, b) => b.winrate - a.winrate);

  return (
    <Card size="sm" className={cardClass}>
      <CardHeader>
        <span className={eyebrow}>{t("mapPerformance.eyebrow")}</span>
        <p className="font-mono text-xs tabular-nums">
          <span className="text-primary">
            {t("record.wins", { count: overallWins })}
          </span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-destructive">
            {t("record.losses", { count: overallLosses })}
          </span>
          <span className="text-muted-foreground">
            {" "}
            · {t("mapPerformance.overall", { winrate: overallWinrate })}
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {maps.slice(0, 8).map((m) => {
          const tone = winrateTone(m.winrate);
          return (
            <div key={m.mapName} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0 truncate">{m.mapName}</span>
              <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full",
                    tone === "good"
                      ? "bg-primary"
                      : tone === "bad"
                        ? "bg-destructive"
                        : "bg-muted-foreground"
                  )}
                  style={{ width: `${Math.max(m.winrate, 2)}%` }}
                />
              </div>
              <span className="text-muted-foreground w-14 shrink-0 text-right font-mono tabular-nums">
                {m.wins}W {m.losses}L
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

type WeeklyPoint = {
  period: string;
  winrate: number;
  wins: number;
  losses: number;
};

function WeeklyWinrateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: WeeklyPoint }[];
}) {
  const t = useTranslations("analyst.cards");
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground border-border z-50 rounded-md border px-3 py-2 shadow-md">
      <p className="text-xs font-medium">{d.period}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">
        {d.winrate}%
      </p>
      <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
        {t("record.winsLosses", { wins: d.wins, losses: d.losses })}
      </p>
    </div>
  );
}

export function TeamTrendsCard({
  winrateOverTime,
  recentForm,
  streak,
}: {
  winrateOverTime: WeeklyPoint[];
  recentForm: {
    last5Winrate: number;
    last10Winrate: number;
    last20Winrate: number;
  };
  streak: {
    currentStreak: { type: string; count: number };
    longestWinStreak: { count: number };
    longestLossStreak: { count: number };
  };
}) {
  const t = useTranslations("analyst.cards");
  const weekly = winrateOverTime.slice(-12);

  return (
    <Card size="sm" className={cardClass}>
      <CardHeader>
        <span className={eyebrow}>{t("teamTrends.eyebrow")}</span>
        <p className="font-mono text-xs tabular-nums">
          {streak.currentStreak.type !== "none" ? (
            <span
              className={
                streak.currentStreak.type === "win"
                  ? "text-primary"
                  : "text-destructive"
              }
            >
              {streak.currentStreak.type === "win"
                ? t("teamTrends.winStreak", {
                    count: streak.currentStreak.count,
                  })
                : t("teamTrends.lossStreak", {
                    count: streak.currentStreak.count,
                  })}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t("teamTrends.noStreak")}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label={t("teamTrends.last5")}
            value={`${recentForm.last5Winrate}%`}
          />
          <StatTile
            label={t("teamTrends.last10")}
            value={`${recentForm.last10Winrate}%`}
          />
          <StatTile
            label={t("teamTrends.last20")}
            value={`${recentForm.last20Winrate}%`}
          />
        </div>

        {weekly.length > 0 && (
          <div className="space-y-2">
            <p className={eyebrow}>{t("teamTrends.weeklyWinRate")}</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart
                data={weekly}
                margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
              >
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  height={16}
                />
                <YAxis domain={[0, 100]} hide />
                <ReferenceLine
                  y={50}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={<WeeklyWinrateTooltip />}
                />
                <Bar dataKey="winrate" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {weekly.map((dp) => (
                    <Cell
                      key={dp.period}
                      fill={barFill[winrateTone(dp.winrate)]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PlayerPerformanceCard({
  playerName,
  mapCount,
  heroes,
  aggregated,
  trends,
}: {
  playerName: string;
  mapCount: number;
  heroes: string[];
  aggregated: {
    kdRatio?: number;
    eliminationsPer10?: number;
    deathsPer10?: number;
    heroDamagePer10?: number;
    healingDealtPer10?: number;
  };
  trends?: { trend: string; trendDescription: string };
}) {
  const t = useTranslations("analyst.cards");
  return (
    <Card size="sm" className={cardClass}>
      <CardHeader>
        <span className={eyebrow}>{t("player.eyebrow")}</span>
        <CardTitle className="text-sm">{playerName}</CardTitle>
        <p className="text-muted-foreground text-xs">
          {t("player.summary", { mapCount, heroes: heroes.join(", ") })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {aggregated.kdRatio != null && (
            <StatTile
              label={t("player.kd")}
              value={aggregated.kdRatio.toFixed(2)}
            />
          )}
          {aggregated.eliminationsPer10 != null && (
            <StatTile
              label={t("player.elims")}
              value={aggregated.eliminationsPer10.toFixed(1)}
            />
          )}
          {aggregated.deathsPer10 != null && (
            <StatTile
              label={t("player.deaths")}
              value={aggregated.deathsPer10.toFixed(1)}
            />
          )}
          {aggregated.heroDamagePer10 != null && (
            <StatTile
              label={t("player.damage")}
              value={aggregated.heroDamagePer10.toFixed(0)}
            />
          )}
          {aggregated.healingDealtPer10 != null && (
            <StatTile
              label={t("player.healing")}
              value={aggregated.healingDealtPer10.toFixed(0)}
            />
          )}
        </div>
        {trends && (
          <div className="flex items-center gap-2 text-xs">
            <TrendBadge trend={trends.trend} />
            <span className="text-muted-foreground">
              {trends.trendDescription}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportCard({
  title,
  url,
}: {
  title: string;
  url: string;
  reportId: string;
}) {
  const t = useTranslations("analyst.cards");
  return (
    <Card size="sm" className={cardClass}>
      <CardHeader>
        <span
          className={cn("flex items-center gap-1.5 whitespace-nowrap", eyebrow)}
        >
          <FileTextIcon className="size-3 shrink-0" aria-hidden="true" />
          {t("report.eyebrow")}
        </span>
        <CardTitle className="text-sm leading-snug text-pretty">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          variant="secondary"
          className="active:scale-[0.97]"
          asChild
        >
          <a href={url}>
            {t("report.viewReport")}
            <ExternalLinkIcon className="size-3" aria-hidden="true" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="border-border flex flex-col gap-1 rounded-md border px-3 py-2">
      <span className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-lg leading-none font-semibold tabular-nums",
          emphasis ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const t = useTranslations("analyst.cards.trend");
  const base =
    "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.12em] uppercase tabular-nums";

  if (trend === "improving") {
    return (
      <span className={cn(base, "bg-primary/15 text-primary")}>
        <TrendingUpIcon className="size-3" aria-hidden="true" />
        {t("up")}
      </span>
    );
  }
  if (trend === "declining") {
    return (
      <span className={cn(base, "bg-destructive/15 text-destructive")}>
        <TrendingDownIcon className="size-3" aria-hidden="true" />
        {t("down")}
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-muted text-muted-foreground")}>
      <MinusIcon className="size-3" aria-hidden="true" />
      {t("stable")}
    </span>
  );
}
