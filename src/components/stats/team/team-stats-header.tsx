import type {
  loadTeamStatsHeaderData,
  TimeframePermissions,
} from "@/app/stats/team/[teamId]/_lib/context";
import { TeamRangePicker } from "@/components/stats/team/team-range-picker";
import { TeamStatsTabsNav } from "@/components/stats/team/team-stats-tabs-nav";
import { TeamTsrStat } from "@/components/stats/team/team-tsr-stat";
import type { Timeframe } from "@/lib/timeframe";
import Image from "next/image";

function formatTimeframeLabel(timeframe: Timeframe): string {
  switch (timeframe) {
    case "one-week":
      return "Last 7 days";
    case "two-weeks":
      return "Last 14 days";
    case "one-month":
      return "Last 30 days";
    case "three-months":
      return "Last 3 months";
    case "six-months":
      return "Last 6 months";
    case "one-year":
      return "Last 365 days";
    case "all-time":
      return "All time";
    case "custom":
      return "Custom range";
  }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
        {label}
      </dt>
      <dd className="text-lg font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function TeamStatsHeader({
  team,
  teamId,
  effectiveTimeframe,
  permissions,
  headerData,
  totalScrimCount,
  positionalEnabled,
  simulationEnabled,
}: {
  team: { name: string; image: string | null };
  teamId: number;
  effectiveTimeframe: Timeframe;
  permissions: TimeframePermissions;
  headerData: Awaited<ReturnType<typeof loadTeamStatsHeaderData>>;
  totalScrimCount: number;
  positionalEnabled: boolean;
  simulationEnabled: boolean;
}) {
  const { winrates, teamTsr } = headerData;
  const totalGames = winrates.overallWins + winrates.overallLosses;
  const timeframeLabel = formatTimeframeLabel(effectiveTimeframe);

  return (
    <>
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div className="flex items-end gap-4">
          <Image
            src={team.image ?? `https://avatar.vercel.sh/${team.name}.png`}
            alt={team.name}
            width={48}
            height={48}
            className="border-border h-12 w-12 shrink-0 rounded-full border object-cover"
          />
          <div>
            <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
              Team · {timeframeLabel}
            </p>
            <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
              {team.name}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          {totalGames > 0 ? (
            <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono">
              <Stat
                label="Record"
                value={`${winrates.overallWins}–${winrates.overallLosses}`}
              />
              <Stat
                label="Winrate"
                value={`${winrates.overallWinrate.toFixed(1)}%`}
              />
              <Stat label="Scrims" value={totalScrimCount} />
              <TeamTsrStat result={teamTsr} />
            </dl>
          ) : null}
          <TeamRangePicker
            permissions={permissions}
            defaultTimeframe={effectiveTimeframe}
          />
        </div>
      </header>
      <TeamStatsTabsNav
        teamId={teamId}
        positionalEnabled={positionalEnabled}
        simulationEnabled={simulationEnabled}
      />
    </>
  );
}
