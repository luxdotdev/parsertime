import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { Cache, Context, Duration, Effect, Layer } from "effect";
import { ScoutingQueryError } from "./errors";
import type { FaceitLinkPlayer, FaceitTeamLink } from "./types";

/**
 * Minimum number of distinct OWCS roster handles that must co-resolve onto a
 * single FACEIT team before we treat the match as corroborated. Three shared
 * handles playing together on one FACEIT team is well past coincidence for the
 * pool sizes involved (handle collisions are per-player; co-occurrence is not).
 */
const CORROBORATION_MIN = 3;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type CandidateRow = {
  faceitPlayerId: string;
  faceitNickname: string;
  battletag: string | null;
};

type RosterTeamRow = {
  faceitPlayerId: string;
  teamId: string | null;
};

type FsrRow = {
  faceitPlayerId: string;
  fsr: number;
};

export type ScoutingFaceitLinkServiceInterface = {
  /**
   * Resolve an OWCS team (by full name, e.g. "Dallas Fuel") to a corroborated
   * FACEIT team, or null when the roster doesn't overlap strongly enough.
   */
  readonly getFaceitTeamLink: (
    teamFullName: string
  ) => Effect.Effect<FaceitTeamLink | null, ScoutingQueryError>;
};

export class ScoutingFaceitLinkService extends Context.Tag(
  "@app/data/scouting/ScoutingFaceitLinkService"
)<ScoutingFaceitLinkService, ScoutingFaceitLinkServiceInterface>() {}

const CACHE_TTL = Duration.minutes(5);
const CACHE_CAPACITY = 128;

export const make: Effect.Effect<ScoutingFaceitLinkServiceInterface> =
  Effect.gen(function* () {
    function getFaceitTeamLink(
      teamFullName: string
    ): Effect.Effect<FaceitTeamLink | null, ScoutingQueryError> {
      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamFullName", teamFullName);

        const roster = yield* Effect.tryPromise({
          try: () =>
            prisma.scoutingPlayer.findMany({
              where: { team: teamFullName },
              select: { name: true },
            }),
          catch: (error) =>
            new ScoutingQueryError({
              operation: "fetch OWCS roster for FACEIT link",
              cause: error,
            }),
        });

        const rosterSize = roster.length;
        if (rosterSize < CORROBORATION_MIN) return null;

        // normalized handle -> the OWCS display name that produced it
        const normToOwcs = new Map<string, string>();
        for (const p of roster) {
          const n = norm(p.name);
          if (n) normToOwcs.set(n, p.name);
        }
        const normNames = [...normToOwcs.keys()];
        if (normNames.length < CORROBORATION_MIN) return null;

        // Candidate FACEIT players whose nickname or battletag matches a handle.
        const candidates = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<CandidateRow[]>`
              SELECT "faceitPlayerId", "faceitNickname", "battletag"
              FROM "FaceitPlayer"
              WHERE regexp_replace(lower("faceitNickname"), '[^a-z0-9]', '', 'g')
                    IN (${Prisma.join(normNames)})
                 OR regexp_replace(
                      lower(split_part(coalesce("battletag", ''), '#', 1)),
                      '[^a-z0-9]', '', 'g'
                    ) IN (${Prisma.join(normNames)})
            `,
          catch: (error) =>
            new ScoutingQueryError({
              operation: "match OWCS handles to FACEIT players",
              cause: error,
            }),
        });

        if (candidates.length === 0) return null;

        // faceitPlayerId -> { owcsName, nickname }
        const candidateInfo = new Map<
          string,
          { owcsName: string; nickname: string }
        >();
        for (const c of candidates) {
          const owcs =
            normToOwcs.get(norm(c.faceitNickname)) ??
            (c.battletag
              ? normToOwcs.get(norm(c.battletag.split("#")[0] ?? ""))
              : undefined);
          if (owcs) {
            candidateInfo.set(c.faceitPlayerId, {
              owcsName: owcs,
              nickname: c.faceitNickname,
            });
          }
        }
        const candidateIds = [...candidateInfo.keys()];
        if (candidateIds.length < CORROBORATION_MIN) return null;

        // The FACEIT teams each candidate has rostered with.
        const rosterTeams = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<RosterTeamRow[]>`
              SELECT r."faceitPlayerId" AS "faceitPlayerId",
                     CASE WHEN r."teamSide" = 1 THEN m."team1FaceitTeamId"
                          ELSE m."team2FaceitTeamId" END AS "teamId"
              FROM "FaceitMatchRoster" r
              JOIN "FaceitMatch" m ON m."faceitMatchId" = r."matchId"
              WHERE r."faceitPlayerId" IN (${Prisma.join(candidateIds)})
            `,
          catch: (error) =>
            new ScoutingQueryError({
              operation: "resolve FACEIT teams for matched players",
              cause: error,
            }),
        });

        // faceitTeamId -> (owcsName -> {playerId, nickname}); distinct owcs names
        // are the corroboration count.
        const teamMembers = new Map<
          string,
          Map<string, { playerId: string; nickname: string }>
        >();
        for (const row of rosterTeams) {
          if (!row.teamId) continue;
          const info = candidateInfo.get(row.faceitPlayerId);
          if (!info) continue;
          const members = teamMembers.get(row.teamId) ?? new Map();
          if (!members.has(info.owcsName)) {
            members.set(info.owcsName, {
              playerId: row.faceitPlayerId,
              nickname: info.nickname,
            });
          }
          teamMembers.set(row.teamId, members);
        }

        let bestTeamId: string | null = null;
        let bestMembers = new Map<
          string,
          { playerId: string; nickname: string }
        >();
        for (const [teamId, members] of teamMembers) {
          if (members.size > bestMembers.size) {
            bestTeamId = teamId;
            bestMembers = members;
          }
        }

        if (!bestTeamId || bestMembers.size < CORROBORATION_MIN) return null;

        const memberPlayerIds = [...bestMembers.values()].map((m) => m.playerId);

        const [fsrRows, team] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.$queryRaw<FsrRow[]>`
                SELECT DISTINCT ON (pf."faceitPlayerId")
                       pf."faceitPlayerId" AS "faceitPlayerId", pf.fsr AS fsr
                FROM "PlayerFsr" pf
                WHERE pf."faceitPlayerId" IN (${Prisma.join(memberPlayerIds)})
                ORDER BY pf."faceitPlayerId", pf."mapCount" DESC
              `,
              prisma.faceitTeam.findUnique({
                where: { faceitTeamId: bestTeamId },
                select: { name: true },
              }),
            ]),
          catch: (error) =>
            new ScoutingQueryError({
              operation: "fetch FACEIT link FSR and team name",
              cause: error,
            }),
        });

        const fsrByPlayer = new Map(fsrRows.map((r) => [r.faceitPlayerId, r.fsr]));

        const sharedPlayers: FaceitLinkPlayer[] = [...bestMembers.entries()]
          .map(([owcsName, m]) => ({
            owcsName,
            faceitNickname: m.nickname,
            fsr: fsrByPlayer.get(m.playerId) ?? null,
          }))
          .sort((a, b) => (b.fsr ?? -1) - (a.fsr ?? -1));

        const rated = sharedPlayers
          .map((p) => p.fsr)
          .filter((v): v is number => v != null);
        const aggregateFsr =
          rated.length > 0
            ? Math.round(rated.reduce((s, v) => s + v, 0) / rated.length)
            : null;

        return {
          faceitTeamId: bestTeamId,
          faceitTeamName: team?.name ?? "",
          rosterSize,
          sharedPlayers,
          aggregateFsr,
          fsrCovered: rated.length,
        } satisfies FaceitTeamLink;
      }).pipe(Effect.withSpan("scouting.getFaceitTeamLink"));
    }

    const linkCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamFullName: string) => getFaceitTeamLink(teamFullName),
    });

    return {
      getFaceitTeamLink: (teamFullName: string) =>
        linkCache.get(teamFullName),
    } satisfies ScoutingFaceitLinkServiceInterface;
  });

export const ScoutingFaceitLinkServiceLive = Layer.effect(
  ScoutingFaceitLinkService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
