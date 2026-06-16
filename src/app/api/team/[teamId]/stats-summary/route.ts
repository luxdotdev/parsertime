import {
  clampTimeframe,
  computeDateRange,
  type TimeframePermissions,
} from "@/app/stats/team/[teamId]/_lib/context";
import { AppRuntime } from "@/data/runtime";
import { TeamStatsService } from "@/data/team";
import { getTeamSubstituteNames } from "@/data/team/substitutes";
import { isAuthedToViewTeam } from "@/lib/auth";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { isValidTimeframe, type Timeframe } from "@/lib/timeframe";
import { computeTeamTsr, matchesAnyName } from "@/lib/tsr/team";
import { Effect } from "effect";
import type { NextRequest } from "next/server";

export type TeamStatsSummaryResponse = {
  team: { name: string; image: string | null };
  permissions: TimeframePermissions;
  effectiveTimeframe: Timeframe;
  totalScrimCount: number;
  winrates: {
    overallWins: number;
    overallLosses: number;
    overallWinrate: number;
  };
  teamTsr: Awaited<ReturnType<typeof computeTeamTsr>>;
};

/**
 * Authed summary used by the persistent team-stats header (rendered in the
 * layout as a client component). Auth lives here and in each page, never in the
 * layout itself.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId: teamIdParam } = await params;
  const teamId = Number(teamIdParam);
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return Response.json({ error: "invalid team" }, { status: 400 });
  }
  if (!(await isAuthedToViewTeam(teamId))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    include: { users: true },
  });
  if (!team) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const sp = new URL(request.url).searchParams;
  const [timeframe1, timeframe2, timeframe3] = await Promise.all([
    new Permission("stats-timeframe-1").check(),
    new Permission("stats-timeframe-2").check(),
    new Permission("stats-timeframe-3").check(),
  ]);
  const permissions: TimeframePermissions = {
    "stats-timeframe-1": timeframe1,
    "stats-timeframe-2": timeframe2,
    "stats-timeframe-3": timeframe3,
  };

  const rawTimeframe = sp.get("timeframe");
  const requestedTimeframe: Timeframe = isValidTimeframe(rawTimeframe)
    ? rawTimeframe
    : "one-week";
  const effectiveTimeframe = clampTimeframe(requestedTimeframe, permissions);
  const dateRange = computeDateRange(
    effectiveTimeframe,
    sp.get("from") ?? undefined,
    sp.get("to") ?? undefined
  );

  const [substituteNames, totalScrimCount, winrates, scrimRows] =
    await Promise.all([
      getTeamSubstituteNames(teamId),
      prisma.scrim.count({ where: { teamId } }),
      AppRuntime.runPromise(
        TeamStatsService.pipe(
          Effect.flatMap((svc) => svc.getTeamWinrates(teamId, dateRange))
        )
      ),
      prisma.scrim.findMany({ where: { teamId }, select: { id: true } }),
    ]);

  const teamTsr = await computeTeamTsr(
    team.users
      .map((u) => ({ id: u.id, name: u.name, battletag: u.battletag }))
      .filter((u) => !matchesAnyName(u, substituteNames)),
    scrimRows.map((r) => r.id)
  );

  return Response.json({
    team: { name: team.name, image: team.image },
    permissions,
    effectiveTimeframe,
    totalScrimCount,
    winrates: {
      overallWins: winrates.overallWins,
      overallLosses: winrates.overallLosses,
      overallWinrate: winrates.overallWinrate,
    },
    teamTsr,
  } satisfies TeamStatsSummaryResponse);
}
