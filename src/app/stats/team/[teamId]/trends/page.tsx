import { RecentFormCard } from "@/components/stats/team/recent-form-card";
import { StatRibbon } from "@/components/stats/team/stat-ribbon";
import { TeamStatsGate } from "@/components/stats/team/team-stats-gate";
import { WinLossStreaksCard } from "@/components/stats/team/win-loss-streaks-card";
import { WinrateOverTimeChart } from "@/components/stats/team/winrate-over-time-chart";
import { AppRuntime } from "@/data/runtime";
import { TeamTrendsService } from "@/data/team";
import type { PagePropsWithLocale } from "@/types/next";
import { Effect } from "effect";
import { loadTeamStatsShell } from "../_lib/context";

export const maxDuration = 60;

export default async function Page(
  props: PagePropsWithLocale<"/stats/team/[teamId]/trends"> & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const shell = await loadTeamStatsShell(params.teamId, searchParams);
  if (shell.gated) {
    return <TeamStatsGate scrimCount={shell.totalScrimCount} />;
  }

  const { teamId, dateRange } = shell;

  const { weeklyWinrate, monthlyWinrate, recentForm, streakInfo } =
    await AppRuntime.runPromise(
      Effect.all(
        {
          weeklyWinrate: TeamTrendsService.pipe(
            Effect.flatMap((svc) =>
              svc.getWinrateOverTime(teamId, "week", dateRange)
            )
          ),
          monthlyWinrate: TeamTrendsService.pipe(
            Effect.flatMap((svc) =>
              svc.getWinrateOverTime(teamId, "month", dateRange)
            )
          ),
          recentForm: TeamTrendsService.pipe(
            Effect.flatMap((svc) => svc.getRecentForm(teamId, dateRange))
          ),
          streakInfo: TeamTrendsService.pipe(
            Effect.flatMap((svc) => svc.getStreakInfo(teamId, dateRange))
          ),
        },
        { concurrency: "unbounded" }
      )
    );

  return (
    <div className="mt-8 space-y-12">
      <StatRibbon
        cells={[
          {
            label: "Last 5",
            value:
              recentForm.last5.length > 0
                ? `${recentForm.last5Winrate.toFixed(0)}%`
                : "—",
            sub:
              recentForm.last5.length > 0
                ? `${recentForm.last5.filter((m) => m.result === "win").length}–${recentForm.last5.filter((m) => m.result === "loss").length}`
                : "no data",
            emphasis: true,
          },
          {
            label: "Last 10",
            value:
              recentForm.last10.length > 0
                ? `${recentForm.last10Winrate.toFixed(0)}%`
                : "—",
            sub:
              recentForm.last10.length > 0
                ? `${recentForm.last10.filter((m) => m.result === "win").length}–${recentForm.last10.filter((m) => m.result === "loss").length}`
                : "no data",
          },
          {
            label: "Last 20",
            value:
              recentForm.last20.length > 0
                ? `${recentForm.last20Winrate.toFixed(0)}%`
                : "—",
            sub:
              recentForm.last20.length > 0
                ? `${recentForm.last20.filter((m) => m.result === "win").length}–${recentForm.last20.filter((m) => m.result === "loss").length}`
                : "no data",
          },
          {
            label: "Current streak",
            value:
              streakInfo.currentStreak.count > 0
                ? `${streakInfo.currentStreak.count}${streakInfo.currentStreak.type === "win" ? "W" : "L"}`
                : "—",
            sub:
              streakInfo.longestWinStreak.count > 0
                ? `${streakInfo.longestWinStreak.count}W best run`
                : "no streaks yet",
          },
        ]}
        columns={4}
      />
      <WinrateOverTimeChart
        weeklyData={weeklyWinrate}
        monthlyData={monthlyWinrate}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <RecentFormCard recentForm={recentForm} />
        <WinLossStreaksCard streakInfo={streakInfo} />
      </div>
    </div>
  );
}
