"use client";

import type { TeamStatsSummaryResponse } from "@/app/api/team/[teamId]/stats-summary/route";
import { TeamRangePicker } from "@/components/stats/team/team-range-picker";
import { TeamTsrStat } from "@/components/stats/team/team-tsr-stat";
import { Skeleton } from "@/components/ui/skeleton";
import type { Timeframe } from "@/lib/timeframe";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

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

async function fetchSummary(
  teamId: number,
  qs: string
): Promise<TeamStatsSummaryResponse> {
  const res = await fetch(
    `/api/team/${teamId}/stats-summary${qs ? `?${qs}` : ""}`
  );
  if (!res.ok) {
    throw new Error(`stats-summary request failed: ${res.status}`);
  }
  return (await res.json()) as TeamStatsSummaryResponse;
}

/**
 * Persistent team-stats header rendered in the layout. Reads the range from the
 * URL and fetches the (authed) summary via React Query, so it survives tab
 * navigation and only refetches when the range changes.
 */
export function TeamStatsHeaderClient({ teamId }: { teamId: number }) {
  const searchParams = useSearchParams();
  const timeframe = searchParams.get("timeframe") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const qsParams = new URLSearchParams();
  if (timeframe) qsParams.set("timeframe", timeframe);
  if (from) qsParams.set("from", from);
  if (to) qsParams.set("to", to);
  const qs = qsParams.toString();

  const { data } = useQuery({
    queryKey: ["team-stats-summary", teamId, timeframe, from, to],
    queryFn: () => fetchSummary(teamId, qs),
    placeholderData: keepPreviousData,
  });

  return (
    <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
      <div className="flex items-end gap-4">
        {data ? (
          <Image
            src={
              data.team.image ??
              `https://avatar.vercel.sh/${data.team.name}.png`
            }
            alt={data.team.name}
            width={48}
            height={48}
            className="border-border h-12 w-12 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        )}
        <div>
          <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
            {data ? (
              `Team · ${formatTimeframeLabel(data.effectiveTimeframe)}`
            ) : (
              <Skeleton className="h-3 w-32" />
            )}
          </p>
          {data ? (
            <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
              {data.team.name}
            </h1>
          ) : (
            <Skeleton className="mt-3 h-9 w-64" />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {data && data.winrates.overallWins + data.winrates.overallLosses > 0 ? (
          <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono">
            <Stat
              label="Record"
              value={`${data.winrates.overallWins}–${data.winrates.overallLosses}`}
            />
            <Stat
              label="Winrate"
              value={`${data.winrates.overallWinrate.toFixed(1)}%`}
            />
            <Stat label="Scrims" value={data.totalScrimCount} />
            <TeamTsrStat result={data.teamTsr} />
          </dl>
        ) : null}
        {data ? (
          <TeamRangePicker
            permissions={data.permissions}
            defaultTimeframe={data.effectiveTimeframe}
          />
        ) : (
          <Skeleton className="h-9 w-[180px]" />
        )}
      </div>
    </header>
  );
}
