import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import { createNewMap } from "@/lib/parser";
import prisma from "@/lib/prisma";
import { advanceMatch } from "@/lib/tournaments/advancement";
import { calculateWinner } from "@/lib/winrate";
import { Prisma } from "@prisma/client";
import type { ParserData } from "@/types/parser";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { unauthorized, unstable_rethrow } from "next/navigation";
import { after, type NextRequest } from "next/server";

type AddTournamentMapRequest = {
  map: ParserData;
  heroBans?: { hero: string; team: string; banPosition: number }[];
  gameNumber: number;
};
type HeroBan = NonNullable<AddTournamentMapRequest["heroBans"]>[number];

const MAX_EVENT_ROWS = 50_000;
const MAX_TOTAL_EVENT_ROWS = 200_000;
const MAX_ROW_STRING_LENGTH = 256;
const MAX_HERO_BANS = 20;
const TOURNAMENT_MATCH_LOCK_NAMESPACE = 61_042;

const parserEventKeys = [
  "ability_1_used",
  "ability_2_used",
  "damage",
  "defensive_assist",
  "dva_remech",
  "echo_duplicate_end",
  "echo_duplicate_start",
  "healing",
  "hero_spawn",
  "hero_swap",
  "kill",
  "match_end",
  "match_start",
  "mercy_rez",
  "objective_captured",
  "objective_updated",
  "offensive_assist",
  "payload_progress",
  "player_stat",
  "point_progress",
  "remech_charged",
  "round_end",
  "round_start",
  "setup_complete",
  "ultimate_charged",
  "ultimate_end",
  "ultimate_start",
] as const;

const requiredParserEventKeys = [
  "defensive_assist",
  "hero_spawn",
  "hero_swap",
  "kill",
  "match_start",
  "objective_captured",
  "objective_updated",
  "offensive_assist",
  "payload_progress",
  "player_stat",
  "point_progress",
  "round_end",
  "round_start",
  "setup_complete",
  "ultimate_charged",
  "ultimate_end",
  "ultimate_start",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOversizedString(row: unknown[]) {
  return row.some(
    (cell) => typeof cell === "string" && cell.length > MAX_ROW_STRING_LENGTH
  );
}

function isBoundedParserData(value: unknown): value is ParserData {
  if (!isRecord(value)) return false;

  let totalRows = 0;

  for (const key of requiredParserEventKeys) {
    if (!Array.isArray(value[key])) return false;
  }

  for (const key of parserEventKeys) {
    const rows = value[key];
    if (rows === undefined) continue;
    if (!Array.isArray(rows) || rows.length > MAX_EVENT_ROWS) return false;
    totalRows += rows.length;
    if (totalRows > MAX_TOTAL_EVENT_ROWS) return false;

    for (const row of rows) {
      if (!Array.isArray(row) || hasOversizedString(row)) return false;
    }
  }

  return true;
}

function isHeroBan(value: unknown): value is HeroBan {
  return (
    isRecord(value) &&
    typeof value.hero === "string" &&
    value.hero.length > 0 &&
    value.hero.length <= MAX_ROW_STRING_LENGTH &&
    typeof value.team === "string" &&
    value.team.length > 0 &&
    value.team.length <= MAX_ROW_STRING_LENGTH &&
    typeof value.banPosition === "number" &&
    Number.isInteger(value.banPosition) &&
    value.banPosition >= 0
  );
}

function parseAddTournamentMapRequest(
  value: unknown
): AddTournamentMapRequest | null {
  if (!isRecord(value)) return null;
  const gameNumber = value.gameNumber;
  if (typeof gameNumber !== "number" || !Number.isInteger(gameNumber)) {
    return null;
  }
  if (gameNumber < 1) return null;
  if (!isBoundedParserData(value.map)) return null;

  let heroBans: HeroBan[] | undefined;
  if (value.heroBans !== undefined) {
    const rawHeroBans = value.heroBans;
    if (
      !Array.isArray(rawHeroBans) ||
      rawHeroBans.length > MAX_HERO_BANS ||
      !rawHeroBans.every(isHeroBan)
    ) {
      return null;
    }
    heroBans = rawHeroBans;
  }

  return {
    map: value.map,
    heroBans,
    gameNumber,
  };
}

const tournamentMapUploadLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "tournament.match.addMap",
    method: "POST",
  };

  try {
    const session = await auth();
    if (!session?.user?.email) {
      event.outcome = "unauthorized";
      unauthorized();
    }
    event.userEmail = session.user.email;

    const { matchId: matchIdStr } = await params;
    const matchId = parseInt(matchIdStr);
    event.matchId = matchId;
    if (isNaN(matchId)) {
      event.outcome = "invalid_id";
      event.statusCode = 400;
      return Response.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const { success: uploadAllowed } = await tournamentMapUploadLimiter.limit(
      `${session.user.email}:${matchId}`
    );
    if (!uploadAllowed) {
      event.outcome = "rate_limited";
      event.statusCode = 429;
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const data = parseAddTournamentMapRequest(await req.json());
    if (!data) {
      event.outcome = "invalid_map_data";
      event.statusCode = 400;
      return Response.json({ error: "Invalid map data" }, { status: 400 });
    }
    event.gameNumber = data.gameNumber;

    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        team1: true,
        team2: true,
        round: true,
        maps: true,
      },
    });

    if (!match) {
      event.outcome = "not_found";
      event.statusCode = 404;
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    event.tournamentId = match.tournamentId;

    if (
      match.status === "COMPLETED" ||
      match.tournament.status === "COMPLETED" ||
      match.tournament.status === "CANCELLED"
    ) {
      event.outcome = "match_locked";
      event.statusCode = 409;
      return Response.json(
        { error: "Cannot add maps to this match" },
        { status: 409 }
      );
    }

    const bestOf = match.round.bestOf ?? match.tournament.bestOf;
    if (data.gameNumber > bestOf) {
      event.outcome = "invalid_game_number";
      event.statusCode = 400;
      return Response.json({ error: "Invalid game number" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (
      user?.id !== match.tournament.creatorId &&
      user?.role !== "ADMIN" &&
      user?.role !== "MANAGER"
    ) {
      event.outcome = "forbidden";
      event.statusCode = 403;
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (match.maps.some((map) => map.gameNumber === data.gameNumber)) {
      event.outcome = "duplicate_game_number";
      event.statusCode = 409;
      return Response.json(
        { error: "A map already exists for this game number" },
        { status: 409 }
      );
    }

    if (!match.scrimId) {
      event.outcome = "no_scrim";
      event.statusCode = 500;
      return Response.json(
        { error: "Match has no associated scrim for map storage" },
        { status: 500 }
      );
    }

    let tournamentMap;
    try {
      tournamentMap = await prisma.tournamentMap.create({
        data: {
          matchId: match.id,
          gameNumber: data.gameNumber,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        event.outcome = "duplicate_game_number";
        event.statusCode = 409;
        return Response.json(
          { error: "A map already exists for this game number" },
          { status: 409 }
        );
      }
      throw error;
    }

    const createdMap = await createNewMap(
      {
        map: data.map,
        scrimId: match.scrimId,
        heroBans: data.heroBans,
      },
      session
    ).catch(async (error) => {
      await prisma.tournamentMap
        .delete({ where: { id: tournamentMap.id } })
        .catch(() => undefined);
      throw error;
    });

    const newMap = await prisma.map.findUnique({
      where: { id: createdMap.mapId },
      include: {
        mapData: {
          include: {
            match_start: true,
            match_end: true,
            round_end: true,
            objective_captured: true,
            payload_progress: true,
            point_progress: true,
          },
        },
      },
    });

    if (!newMap) {
      await prisma.tournamentMap
        .delete({ where: { id: tournamentMap.id } })
        .catch(() => undefined);
      await prisma.map
        .delete({ where: { id: createdMap.mapId } })
        .catch(() => undefined);
      event.outcome = "map_creation_failed";
      event.statusCode = 500;
      return Response.json({ error: "Failed to create map" }, { status: 500 });
    }

    const mapData = newMap.mapData[0];
    let winner: string | null = null;

    if (mapData) {
      const matchStart = mapData.match_start[0] ?? null;
      const finalRound =
        mapData.round_end.length > 0
          ? mapData.round_end.reduce((latest, re) =>
              re.round_number > latest.round_number ? re : latest
            )
          : null;

      const team1Name = matchStart?.team_1_name ?? "";
      const team2Name = matchStart?.team_2_name ?? "";

      const team1Captures = mapData.objective_captured.filter(
        (oc) => oc.capturing_team === team1Name
      );
      const team2Captures = mapData.objective_captured.filter(
        (oc) => oc.capturing_team === team2Name
      );
      const team1PayloadProgress = mapData.payload_progress.filter(
        (pp) => pp.capturing_team === team1Name
      );
      const team2PayloadProgress = mapData.payload_progress.filter(
        (pp) => pp.capturing_team === team2Name
      );
      const team1PointProgress = mapData.point_progress.filter(
        (pp) => pp.capturing_team === team1Name
      );
      const team2PointProgress = mapData.point_progress.filter(
        (pp) => pp.capturing_team === team2Name
      );

      const result = calculateWinner({
        matchDetails: matchStart,
        finalRound,
        team1Captures,
        team2Captures,
        team1PayloadProgress,
        team2PayloadProgress,
        team1PointProgress,
        team2PointProgress,
      });

      if (result !== "N/A") {
        // Map in-game team name to tournament team name by position.
        // The replay's team_1 corresponds to the match's team1 (left),
        // and team_2 corresponds to team2 (right).
        if (result === team1Name && match.team1?.name) {
          winner = match.team1.name;
        } else if (result === team2Name && match.team2?.name) {
          winner = match.team2.name;
        } else {
          winner = result;
        }
      }
    }

    const finalization = await finalizeTournamentMap({
      tournamentMapId: tournamentMap.id,
      matchId: match.id,
      mapId: newMap.id,
      winner,
    });

    if (finalization.status === "not_found") {
      event.outcome = "map_creation_failed";
      event.statusCode = 500;
      return Response.json({ error: "Failed to create map" }, { status: 500 });
    }

    if (finalization.status === "match_completed") {
      event.outcome = "match_locked";
      event.statusCode = 409;
      return Response.json(
        { error: "Cannot add maps to this match" },
        { status: 409 }
      );
    }

    if (
      finalization.isDecided &&
      finalization.winnerId &&
      finalization.loserId &&
      finalization.match
    ) {
      await advanceMatch(
        finalization.match,
        finalization.winnerId,
        finalization.loserId
      );
    }

    event.winner = winner ?? "auto";
    event.needsManualWinner = winner === null;

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_MATCH_UPDATED",
        target: match.id.toString(),
        details: `Map ${data.gameNumber} added to match #${match.id}`,
      });
    });

    event.outcome = "success";
    event.statusCode = 200;
    return Response.json({
      mapId: newMap.id,
      tournamentMapId: tournamentMap.id,
      winner,
      needsManualWinner: winner === null,
    });
  } catch (e) {
    unstable_rethrow(e);
    event.outcome = "error";
    event.statusCode = 500;
    event.error = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Failed to add map" }, { status: 500 });
  } finally {
    event.durationMs = Date.now() - startTime;
    const logFn =
      event.outcome === "error"
        ? (e: Record<string, unknown>) => Logger.error(e)
        : (e: Record<string, unknown>) => Logger.info(e);
    logFn(event);
  }
}

async function finalizeTournamentMap({
  tournamentMapId,
  matchId,
  mapId,
  winner,
}: {
  tournamentMapId: number;
  matchId: number;
  mapId: number;
  winner: string | null;
}) {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TOURNAMENT_MATCH_LOCK_NAMESPACE}::integer, ${matchId}::integer)`;

    const tournamentMap = await tx.tournamentMap.findUnique({
      where: { id: tournamentMapId },
      select: { id: true, matchId: true },
    });

    if (!tournamentMap || tournamentMap.matchId !== matchId) {
      await tx.map.delete({ where: { id: mapId } }).catch(() => undefined);
      return { status: "not_found" as const };
    }

    const match = await tx.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        team1: true,
        team2: true,
        round: true,
        maps: true,
      },
    });

    if (!match) {
      await tx.tournamentMap.delete({ where: { id: tournamentMapId } });
      await tx.map.delete({ where: { id: mapId } }).catch(() => undefined);
      return { status: "not_found" as const };
    }

    if (match.status === "COMPLETED" && match.winnerId) {
      await tx.tournamentMap.delete({ where: { id: tournamentMapId } });
      await tx.map.delete({ where: { id: mapId } }).catch(() => undefined);
      return { status: "match_completed" as const };
    }

    await tx.tournamentMap.update({
      where: { id: tournamentMapId },
      data: {
        mapId,
        winnerOverride: winner,
      },
    });

    if (!winner || !match.team1 || !match.team2) {
      return {
        status: "ok" as const,
        isDecided: false,
        winnerId: null,
        loserId: null,
        match: null,
      };
    }

    let team1Wins = 0;
    let team2Wins = 0;

    for (const map of match.maps) {
      const mapWinner =
        map.id === tournamentMapId ? winner : map.winnerOverride;
      if (mapWinner === match.team1.name) team1Wins++;
      else if (mapWinner === match.team2.name) team2Wins++;
    }

    const bestOf = match.round.bestOf ?? match.tournament.bestOf;
    const winsNeeded = Math.ceil(bestOf / 2);
    const isDecided = team1Wins >= winsNeeded || team2Wins >= winsNeeded;
    const winnerId =
      team1Wins >= winsNeeded
        ? match.team1Id
        : team2Wins >= winsNeeded
          ? match.team2Id
          : null;

    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: {
        team1Score: team1Wins,
        team2Score: team2Wins,
        status: isDecided ? "COMPLETED" : "ONGOING",
        winnerId: isDecided ? winnerId : null,
      },
    });

    const loserId = winnerId
      ? winnerId === match.team1Id
        ? match.team2Id
        : match.team1Id
      : null;

    return {
      status: "ok" as const,
      isDecided,
      winnerId,
      loserId,
      match: {
        id: match.id,
        tournamentId: match.tournamentId,
        bracketPosition: match.bracketPosition,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        round: {
          roundNumber: match.round.roundNumber,
          bracket: match.round.bracket,
        },
        tournament: {
          format: match.tournament.format,
          bestOf: match.tournament.bestOf,
          grandFinalReset: match.tournament.grandFinalReset,
        },
      },
    };
  });
}
