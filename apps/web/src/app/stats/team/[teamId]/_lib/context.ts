import {
  getCachedTeamSubstituteNames,
  getCachedTeamWinrates,
} from "@/data/cached/team-cache";
import { AppRuntime } from "@/data/runtime";
import { type TeamDateRange } from "@/data/team";
import { UserService } from "@/data/user";
import { $Enums } from "@/generated/prisma/browser";
import { auth, canManageTeam } from "@/lib/auth";
import { positionalData, simulationTool } from "@/lib/flags";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { isValidTimeframe, type Timeframe } from "@/lib/timeframe";
import { computeTeamTsr, matchesAnyName } from "@/lib/tsr/team";
import { addDays, addMonths, addWeeks, addYears, startOfDay } from "date-fns";
import { Effect } from "effect";
import { notFound } from "next/navigation";

export type TimeframePermissions = {
  "stats-timeframe-1": boolean;
  "stats-timeframe-2": boolean;
  "stats-timeframe-3": boolean;
};

export function computeDateRange(
  timeframe: Timeframe,
  customFrom?: string,
  customTo?: string
): TeamDateRange | undefined {
  // `to` anchors to the START OF TOMORROW rather than the exact instant. This
  // range feeds `getCachedTeamWinrates`' cache key, and PPR renders each request
  // twice (cache-warming + final prerender). A raw `new Date()` differs by
  // milliseconds between the two passes, so the key would never match ("Unexpected
  // cache miss after cache warming phase"). Quantizing to a day boundary makes the
  // key change only once per day — matching the `cacheLife("days")` on the cached
  // read — while start-of-tomorrow keeps all of today's scrims inside the window.
  const to = startOfDay(addDays(new Date(), 1));

  switch (timeframe) {
    case "one-week":
      return { from: addWeeks(to, -1), to };
    case "two-weeks":
      return { from: addWeeks(to, -2), to };
    case "one-month":
      return { from: addMonths(to, -1), to };
    case "three-months":
      return { from: addMonths(to, -3), to };
    case "six-months":
      return { from: addMonths(to, -6), to };
    case "one-year":
      return { from: addYears(to, -1), to };
    case "all-time":
      return undefined;
    case "custom": {
      if (customFrom && customTo) {
        const from = new Date(customFrom);
        const customToDate = new Date(customTo);
        if (!isNaN(from.getTime()) && !isNaN(customToDate.getTime())) {
          return { from, to: customToDate };
        }
      }
      return { from: addWeeks(to, -1), to };
    }
  }
}

export function clampTimeframe(
  requested: Timeframe,
  permissions: Record<string, boolean>
): Timeframe {
  const tier3Only: Timeframe[] = ["one-year", "all-time", "custom"];
  const tier2Only: Timeframe[] = ["three-months", "six-months"];

  if (tier3Only.includes(requested) && !permissions["stats-timeframe-3"]) {
    return permissions["stats-timeframe-2"] ? "six-months" : "one-month";
  }
  if (tier2Only.includes(requested) && !permissions["stats-timeframe-2"]) {
    return "one-month";
  }
  return requested;
}

async function loadTeam(teamId: number) {
  return prisma.team.findFirst({
    where: { id: teamId },
    include: { users: true },
  });
}

export type TeamWithUsers = NonNullable<Awaited<ReturnType<typeof loadTeam>>>;

export type TeamStatsShell =
  | { gated: true; team: TeamWithUsers; totalScrimCount: number }
  | {
      gated: false;
      team: TeamWithUsers;
      teamId: number;
      isManager: boolean;
      substituteNames: Set<string>;
      totalScrimCount: number;
      permissions: TimeframePermissions;
      effectiveTimeframe: Timeframe;
      dateRange: TeamDateRange | undefined;
      positionalEnabled: boolean;
      simulationEnabled: boolean;
    };

/**
 * Shared setup for every team-stats route: auth, team + access check, the
 * insufficient-scrims gate, permission-clamped timeframe, and the nav feature
 * flags. Range-dependent pages call this, then fetch only their own slice.
 */
export async function loadTeamStatsShell(
  teamIdParam: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<TeamStatsShell> {
  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user.email)))
  );
  if (!user) notFound();

  const teamId = parseInt(teamIdParam);
  const team = await loadTeam(teamId);
  if (!team) notFound();

  const userIsMember = team.users.some((u) => u.id === user.id);
  if (!userIsMember && user.role !== $Enums.UserRole.ADMIN) notFound();

  const totalScrimCount = await prisma.scrim.count({ where: { teamId } });
  if (totalScrimCount < 2) {
    return { gated: true, team, totalScrimCount };
  }

  const [isManager, substituteNames] = await Promise.all([
    canManageTeam(teamId, user),
    getCachedTeamSubstituteNames(teamId),
  ]);

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

  const rawTimeframe =
    typeof searchParams.timeframe === "string" ? searchParams.timeframe : null;
  const requestedTimeframe: Timeframe = isValidTimeframe(rawTimeframe)
    ? rawTimeframe
    : "one-week";
  const effectiveTimeframe = clampTimeframe(requestedTimeframe, permissions);

  const customFrom =
    typeof searchParams.from === "string" ? searchParams.from : undefined;
  const customTo =
    typeof searchParams.to === "string" ? searchParams.to : undefined;
  const dateRange = computeDateRange(effectiveTimeframe, customFrom, customTo);

  const [positionalEnabled, simulationEnabled] = await Promise.all([
    positionalData(),
    simulationTool(),
  ]);

  return {
    gated: false,
    team,
    teamId,
    isManager,
    substituteNames,
    totalScrimCount,
    permissions,
    effectiveTimeframe,
    dateRange,
    positionalEnabled,
    simulationEnabled,
  };
}

/**
 * The range-dependent summary ribbon data (record/winrate + TSR) shown in the
 * shared header on every tab. Cheap and Effect-cached, so re-running per
 * navigation is fine.
 */
export async function loadTeamStatsHeaderData(
  shell: Extract<TeamStatsShell, { gated: false }>
) {
  const { teamId, team, dateRange, substituteNames } = shell;
  const [winrates, teamTsr] = await Promise.all([
    getCachedTeamWinrates(teamId, dateRange),
    prisma.scrim
      .findMany({ where: { teamId }, select: { id: true } })
      .then((rows) =>
        computeTeamTsr(
          team.users
            .map((u) => ({
              id: u.id,
              name: u.name,
              battletag: u.battletag,
            }))
            // Substitutes are excluded from the team's aggregate skill rating.
            .filter((u) => !matchesAnyName(u, substituteNames)),
          rows.map((r) => r.id)
        )
      ),
  ]);
  return { winrates, teamTsr };
}
