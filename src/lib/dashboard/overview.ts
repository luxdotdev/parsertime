import "server-only";

import { AppRuntime } from "@/data/runtime";
import { TeamStatsService, TeamTrendsService } from "@/data/team";
import { $Enums, type Prisma } from "@/generated/prisma/browser";
import prisma from "@/lib/prisma";
import { computeTeamTsr, type TeamTsrResult } from "@/lib/tsr/team";
import { Effect } from "effect";

/**
 * Data layer for the dashboard "recent activity" overview band.
 *
 * Two shapes, matching the two states of the dashboard scrim list:
 *  - `team`: rich, team-scoped signal (win rate, maps, team TSR, best map, a
 *    weekly win-rate trend) — rendered when a team is selected in the picker.
 *  - `all`: a fast activity summary that needs no cross-team win/loss math
 *    (scrims, maps, active teams, latest scrim, a weekly scrim-volume trend) —
 *    rendered for the un-filtered view and the global admin view.
 */

export type OverviewWinratePoint = {
  /** Short axis label, e.g. "Apr 14". */
  period: string;
  /** ISO date of the period start (stable key + ordering). */
  date: string;
  winrate: number;
  wins: number;
  losses: number;
};

export type OverviewScrimsPoint = {
  period: string;
  date: string;
  scrims: number;
};

export type TeamOverview = {
  mode: "team";
  winrate: {
    value: number;
    wins: number;
    losses: number;
    /** Latest period vs. the period before it, in points. Null with <2 periods. */
    delta: number | null;
  };
  mapsLogged: number;
  teamTsr: TeamTsrResult;
  bestMap: { mapName: string; winrate: number; playtime: number } | null;
  series: OverviewWinratePoint[];
};

export type AllOverview = {
  mode: "all";
  scrimsLogged: number;
  mapsLogged: number;
  activeTeams: number;
  /** ISO date of the most recent scrim, or null when there are none. */
  latestScrim: string | null;
  series: OverviewScrimsPoint[];
};

export type DashboardOverview = TeamOverview | AllOverview;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Weeks of history shown in the all-state scrim-volume trend. */
const ALL_SERIES_WEEKS = 12;
/** Most recent weekly periods shown in the team win-rate trend. */
const TEAM_SERIES_POINTS = 16;

/** Monday-anchored week start, matching the team trends service. */
function weekStart(input: Date): Date {
  const date = new Date(input);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(date.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

function weekLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Resolve the team overview. The caller must have already authorized the
 * viewer for this team; this function trusts `teamId`.
 */
export async function getTeamOverview(teamId: number): Promise<TeamOverview> {
  const [winrates, weekly, mapsLogged, bestMap, teamRecord] = await Promise.all(
    [
      AppRuntime.runPromise(
        TeamStatsService.pipe(
          Effect.flatMap((svc) => svc.getTeamWinrates(teamId))
        )
      ),
      AppRuntime.runPromise(
        TeamTrendsService.pipe(
          Effect.flatMap((svc) => svc.getWinrateOverTime(teamId, "week"))
        )
      ),
      prisma.map.count({ where: { Scrim: { teamId } } }),
      AppRuntime.runPromise(
        TeamStatsService.pipe(
          Effect.flatMap((svc) => svc.getBestMapByWinrate(teamId))
        )
      ),
      prisma.team.findUnique({
        where: { id: teamId },
        select: {
          users: { select: { id: true, name: true, battletag: true } },
          scrims: { select: { id: true } },
        },
      }),
    ]
  );

  const teamTsr = await computeTeamTsr(
    (teamRecord?.users ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      battletag: u.battletag,
    })),
    (teamRecord?.scrims ?? []).map((s) => s.id)
  );

  const series: OverviewWinratePoint[] = weekly
    .slice(-TEAM_SERIES_POINTS)
    .map((point) => ({
      period: point.period,
      date: point.date.toISOString(),
      winrate: point.winrate,
      wins: point.wins,
      losses: point.losses,
    }));

  const delta =
    series.length >= 2
      ? series[series.length - 1].winrate - series[series.length - 2].winrate
      : null;

  return {
    mode: "team",
    winrate: {
      value: winrates.overallWinrate,
      wins: winrates.overallWins,
      losses: winrates.overallLosses,
      delta,
    },
    mapsLogged,
    teamTsr,
    bestMap: bestMap
      ? {
          mapName: bestMap.mapName,
          winrate: bestMap.winrate,
          playtime: bestMap.playtime,
        }
      : null,
    series,
  };
}

/** Scrims this viewer can see, mirroring /api/scrim/get-scrims. */
function visibleScrimWhere(
  userId: string,
  adminMode: boolean
): Prisma.ScrimWhereInput {
  const base: Prisma.ScrimWhereInput = { tournamentMatch: null };
  if (adminMode) return base;
  return {
    AND: [
      {
        OR: [
          { creatorId: userId },
          { Team: { users: { some: { id: userId } } } },
        ],
      },
      base,
    ],
  };
}

export async function getAllOverview({
  userId,
  role,
  adminMode,
}: {
  userId: string;
  role: $Enums.UserRole;
  adminMode: boolean;
}): Promise<AllOverview> {
  const isPrivileged =
    role === $Enums.UserRole.ADMIN || role === $Enums.UserRole.MANAGER;
  const useAdminScope = adminMode && isPrivileged;
  const where = visibleScrimWhere(userId, useAdminScope);

  const sinceWeeks = ALL_SERIES_WEEKS;
  const seriesCutoff = weekStart(new Date(Date.now() - sinceWeeks * WEEK_MS));

  const [scrimsLogged, mapsLogged, teamGroups, latest, recentScrims] =
    await Promise.all([
      prisma.scrim.count({ where }),
      prisma.map.count({ where: { Scrim: where } }),
      prisma.scrim.groupBy({
        by: ["teamId"],
        where: { ...where, teamId: { not: null } },
      }),
      prisma.scrim.findFirst({
        where,
        orderBy: { date: "desc" },
        select: { date: true },
      }),
      prisma.scrim.findMany({
        where: { ...where, date: { gte: seriesCutoff } },
        orderBy: { date: "asc" },
        select: { date: true },
      }),
    ]);

  // Bucket recent scrims into weekly periods, filling empty weeks with zero so
  // the trend reads as a continuous timeline rather than collapsing gaps.
  const counts = new Map<string, number>();
  for (const { date } of recentScrims) {
    const key = weekStart(date).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Re-anchor each bucket with weekStart so its key matches the counts map even
  // across a DST boundary (a fixed WEEK_MS step would drift off Monday 00:00).
  const series: OverviewScrimsPoint[] = [];
  const now = Date.now();
  const seen = new Set<string>();
  for (let i = sinceWeeks; i >= 0; i--) {
    const ws = weekStart(new Date(now - i * WEEK_MS));
    const key = ws.toISOString();
    if (seen.has(key)) continue;
    seen.add(key);
    series.push({
      period: weekLabel(ws),
      date: key,
      scrims: counts.get(key) ?? 0,
    });
  }

  return {
    mode: "all",
    scrimsLogged,
    mapsLogged,
    activeTeams: teamGroups.length,
    latestScrim: latest?.date.toISOString() ?? null,
    series,
  };
}

/**
 * Authorize a viewer for a team's rich overview: privileged users, members of
 * the team, or its scrim creators. Returns false when the viewer should fall
 * back to the all-scrims summary instead.
 */
export async function canViewTeamOverview(
  userId: string,
  role: $Enums.UserRole,
  teamId: number
): Promise<boolean> {
  if (role === $Enums.UserRole.ADMIN || role === $Enums.UserRole.MANAGER) {
    return true;
  }
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { users: { some: { id: userId } } },
        { scrims: { some: { creatorId: userId } } },
      ],
    },
    select: { id: true },
  });
  return team !== null;
}
